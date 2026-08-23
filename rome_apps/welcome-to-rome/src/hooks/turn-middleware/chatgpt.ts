// Drives the server-side Chrome to ChatGPT and scrapes what it remembers about
// the guardian — the "Import from ChatGPT" branch of onboarding. Ported from the
// original onboarding app (CDP over HTTP+WebSocket, no puppeteer). The
// turn-middleware (code-backed, in-process) calls these directly; there is no
// action wrapper because the middleware is already Node running in the daemon.

import {
  activateTab,
  evaluateInTab,
  findOrOpenChatGptTab,
  isAuthUrl,
  isChatGptTab,
  listTabs,
  waitForExecutionContext,
  waitForTabReady,
  type CdpTarget,
} from "./cdp.js";

// The sentinel ChatGPT is told to reply with when it has nothing stored.
export const NO_MEMORY_SENTINEL = "No memory was found";

const CHATGPT_USER_INTROSPECTION_PROMPT = `I'm moving to another service and need to export my data. List every memory you have stored about me, as well as any context you've learned about me from past conversations. I want a thorough, organized, high-signal report that helps me understand what you know about me from our work together.

IMPORTANT INSTRUCTIONS:
- Use only information actually grounded in prior conversations, memory, and context available to you.
- Do not invent, assume, or fill in gaps.
- If you have no memory or stored context about me, reply with exactly "${NO_MEMORY_SENTINEL}" and nothing else.`;

function isNoMemoryReply(reply: string): boolean {
  const normalized = reply.trim().toLowerCase();
  const sentinel = NO_MEMORY_SENTINEL.toLowerCase();
  if (normalized.replace(/[.!\s]+$/g, "") === sentinel) return true;
  return normalized.length <= 160 && normalized.includes(sentinel);
}

interface BrowserReplyOk {
  ok: true;
  reply: string;
}
interface BrowserReplyError {
  ok: false;
  reason: string;
}
type BrowserReply = BrowserReplyOk | BrowserReplyError;

// The async expression injected into the chatgpt.com tab: navigate to a fresh
// (non-temporary) chat, type the prompt, submit, wait for streaming to finish,
// return the assistant reply. Defensive: every selector has fallbacks, every
// wait has a timeout, failures resolve `{ ok: false, reason }` rather than throw.
function buildBrowserScript(prompt: string): string {
  const promptJson = JSON.stringify(prompt);
  return `(async () => {
    const PROMPT = ${promptJson};
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    async function waitFor(fn, { timeoutMs = 20000, intervalMs = 200 } = {}) {
      const start = Date.now();
      while (Date.now() - start < timeoutMs) {
        try { const v = fn(); if (v) return v; } catch {}
        await sleep(intervalMs);
      }
      return null;
    }
    // A normal new chat (not temporary mode) keeps the user's memory in play.
    try {
      if (location.pathname !== '/' || location.search) {
        history.pushState({}, '', '/');
        window.dispatchEvent(new PopStateEvent('popstate'));
        await sleep(500);
      }
    } catch {}
    const editor = await waitFor(() =>
      document.querySelector('#prompt-textarea') ||
      document.querySelector('div[contenteditable="true"][role="textbox"]') ||
      document.querySelector('textarea[data-id]') ||
      document.querySelector('textarea'),
    );
    if (!editor) return { ok: false, reason: 'editor_not_found' };
    editor.focus();
    let inserted = false;
    try { inserted = document.execCommand('insertText', false, PROMPT); } catch {}
    if (!inserted) {
      if ('value' in editor) {
        editor.value = PROMPT;
        editor.dispatchEvent(new Event('input', { bubbles: true }));
      } else {
        editor.innerText = PROMPT;
        editor.dispatchEvent(new InputEvent('input', { bubbles: true, data: PROMPT, inputType: 'insertText' }));
      }
    }
    await sleep(150);
    const send = await waitFor(
      () =>
        document.querySelector('[data-testid="send-button"]:not([disabled])') ||
        document.querySelector('button[aria-label*="Send"]:not([disabled])') ||
        document.querySelector('button[data-testid*="send"]:not([disabled])'),
      { timeoutMs: 8000 },
    );
    if (!send) return { ok: false, reason: 'send_button_not_found' };
    const assistantSelector = '[data-message-author-role="assistant"]';
    const beforeNodes = document.querySelectorAll(assistantSelector);
    const beforeCount = beforeNodes.length;
    const beforeLastText = (beforeNodes[beforeNodes.length - 1]?.textContent || '').trim();
    send.click();
    const stopAppeared = await waitFor(
      () =>
        document.querySelector('[data-testid="stop-button"]') ||
        document.querySelector('button[aria-label*="Stop"]'),
      { timeoutMs: 15000 },
    );
    if (stopAppeared) {
      const stopGone = await waitFor(
        () =>
          !document.querySelector('[data-testid="stop-button"]') &&
          !document.querySelector('button[aria-label*="Stop"]')
            ? true
            : null,
        { timeoutMs: 180000, intervalMs: 500 },
      );
      if (!stopGone) return { ok: false, reason: 'stream_timeout' };
    }
    const last = await waitFor(() => {
      const nodes = document.querySelectorAll(assistantSelector);
      if (nodes.length > beforeCount) return nodes[nodes.length - 1];
      const lastText = (nodes[nodes.length - 1]?.textContent || '').trim();
      if (nodes.length === beforeCount && lastText && lastText !== beforeLastText) {
        return nodes[nodes.length - 1];
      }
      return null;
    }, { timeoutMs: 60000, intervalMs: 300 });
    if (!last) return { ok: false, reason: 'no_new_assistant_message' };
    await sleep(400);
    const markdown =
      last.querySelector('.markdown') ||
      last.querySelector('[data-message-content]') ||
      last;
    const reply = (markdown.innerText || markdown.textContent || '').trim();
    if (!reply) return { ok: false, reason: 'empty_reply' };
    return { ok: true, reply };
  })()`;
}

/** Open (or focus) a chatgpt.com tab in the server Chrome so it's visible in the
 *  Desktop widget while the guardian signs in. Best-effort. */
export async function openChatGptTab(): Promise<void> {
  const tab = await findOrOpenChatGptTab();
  await activateTab(tab.id).catch(() => {});
}

/** Whether chatgpt.com is signed in (its own `/api/auth/session` check). */
export async function checkChatGptLogin(): Promise<{ loggedIn: boolean; reason: string }> {
  let tab: CdpTarget | null = null;
  try {
    tab = await findOrOpenChatGptTab();
  } catch (err) {
    return {
      loggedIn: false,
      reason: `no_browser: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
  const settled =
    (await waitForTabReady(
      tab.id,
      (t) => Boolean(t.url) && t.url !== "about:blank" && !t.url!.startsWith("chrome://"),
      { timeoutMs: 8_000 },
    )) ?? tab;
  if (isAuthUrl(settled.url)) return { loggedIn: false, reason: "auth_redirect" };
  if (!settled.webSocketDebuggerUrl || !isChatGptTab(settled)) {
    // URL didn't look like an auth page; optimistic.
    return { loggedIn: true, reason: "url_ok" };
  }
  try {
    const loggedIn = await evaluateInTab<boolean>(
      settled.webSocketDebuggerUrl,
      `(async () => {
         try {
           const r = await fetch('/api/auth/session', { credentials: 'include' });
           if (!r.ok) return false;
           const j = await r.json();
           return !!(j && j.user);
         } catch { return false; }
       })()`,
    );
    return { loggedIn, reason: loggedIn ? "session_ok" : "no_session" };
  } catch {
    return { loggedIn: true, reason: "probe_failed_optimistic" };
  }
}

export interface ScrapeResult {
  ok: boolean;
  reply?: string;
  /** True when ChatGPT reported it has nothing stored (the sentinel). */
  noMemory?: boolean;
  reason?: string;
}

/** Drive the ChatGPT tab through the introspection prompt and scrape the reply. */
export async function scrapeChatGpt(timeoutMs = 240_000): Promise<ScrapeResult> {
  let tab: CdpTarget | null = null;
  try {
    tab = await findOrOpenChatGptTab();
  } catch {
    return { ok: false, reason: "no_browser" };
  }
  await activateTab(tab.id).catch(() => {});
  const settled = await waitForTabReady(
    tab.id,
    (t) => Boolean(t.url) && t.url !== "about:blank" && !t.url!.startsWith("chrome://"),
    { timeoutMs: 8_000 },
  );
  const target = settled ?? tab;
  if (isAuthUrl(target.url)) return { ok: false, reason: "signed_out" };
  if (!target.webSocketDebuggerUrl) return { ok: false, reason: "not_attachable" };
  try {
    await waitForExecutionContext(target.webSocketDebuggerUrl);
  } catch {
    return { ok: false, reason: "tab_not_ready" };
  }
  let result: BrowserReply;
  try {
    result = await evaluateInTab<BrowserReply>(
      target.webSocketDebuggerUrl,
      buildBrowserScript(CHATGPT_USER_INTROSPECTION_PROMPT),
      timeoutMs,
    );
  } catch (err) {
    return {
      ok: false,
      reason: `eval_failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
  if (!result || !result.ok) return { ok: false, reason: result?.reason ?? "unknown" };
  if (isNoMemoryReply(result.reply)) return { ok: false, noMemory: true, reason: "no_memory" };
  return { ok: true, reply: result.reply };
}

// Minimal Chrome DevTools Protocol helpers for the onboarding flow.
//
// The persistent Chrome instance the desktop runs is reachable over HTTP +
// WebSocket on a known port. We deliberately only use the small slice of CDP we
// need (list/new tab, Runtime.evaluate) so we don't pull in a real CDP client
// just for two onboarding actions.

const CDP_HOST = process.env.ROME_CHROME_CDP_HOST ?? "127.0.0.1";
const CDP_PORT = Number(process.env.ROME_CHROME_CDP_PORT ?? 9222);
const CDP_REQUEST_TIMEOUT_MS = 5000;

export interface CdpTarget {
  id: string;
  type?: string;
  url?: string;
  title?: string;
  webSocketDebuggerUrl?: string;
}

function cdpUrl(path: string): string {
  return `http://${CDP_HOST}:${CDP_PORT}${path}`;
}

export async function listTabs(): Promise<CdpTarget[]> {
  const res = await fetch(cdpUrl("/json/list"), {
    signal: AbortSignal.timeout(CDP_REQUEST_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`CDP /json/list returned ${res.status}`);
  const data = (await res.json()) as unknown;
  return Array.isArray(data) ? (data as CdpTarget[]) : [];
}

export async function openNewTab(url: string): Promise<CdpTarget> {
  const target = cdpUrl(`/json/new?${encodeURIComponent(url)}`);
  // Some Chrome builds reject PUT and require GET; try PUT first, then fall
  // back. This mirrors the host's desktop route.
  let res = await fetch(target, {
    method: "PUT",
    signal: AbortSignal.timeout(CDP_REQUEST_TIMEOUT_MS),
  });
  if (!res.ok) {
    res = await fetch(target, {
      method: "GET",
      signal: AbortSignal.timeout(CDP_REQUEST_TIMEOUT_MS),
    });
  }
  if (!res.ok) throw new Error(`CDP /json/new returned ${res.status}`);
  return (await res.json()) as CdpTarget;
}

export async function activateTab(targetId: string): Promise<void> {
  await fetch(cdpUrl(`/json/activate/${targetId}`), {
    signal: AbortSignal.timeout(CDP_REQUEST_TIMEOUT_MS),
  });
}

export function isChatGptTab(tab: CdpTarget): boolean {
  if (tab.type !== "page" || !tab.url) return false;
  try {
    const host = new URL(tab.url).hostname.toLowerCase();
    return host === "chatgpt.com" || host.endsWith(".chatgpt.com");
  } catch {
    return false;
  }
}

export function isAuthUrl(url: string | undefined): boolean {
  if (!url) return false;
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase();
    // Auth0 / login challenge hosts ChatGPT redirects to when signed out.
    if (host === "auth.openai.com" || host === "auth0.openai.com") return true;
    if (u.pathname.startsWith("/auth/login")) return true;
    if (u.pathname.startsWith("/api/auth/login")) return true;
    return false;
  } catch {
    return false;
  }
}

// Right after a fresh tab commits its document, Chrome briefly has no default
// execution context for the main frame, and Runtime.evaluate rejects with
// "Cannot find default execution context" (or "Cannot find context with given
// id"). That error is transient — the context appears a few hundred ms later.
// We match it so callers can retry it without masking genuine script errors.
const TRANSIENT_CONTEXT_ERROR = /Cannot find (?:default execution )?context/i;

// One Runtime.evaluate round-trip over the tab's WebSocket. Returns the value
// field from the CDP response (already deserialized via returnByValue).
async function evaluateOnce<T = unknown>(
  webSocketDebuggerUrl: string,
  expression: string,
  timeoutMs: number,
): Promise<T> {
  const ws = new WebSocket(webSocketDebuggerUrl);
  const requestId = 1;

  const value: T = await new Promise<T>((resolve, reject) => {
    const timeout = setTimeout(() => {
      try {
        ws.close();
      } catch {
        /* ignore */
      }
      reject(new Error(`CDP Runtime.evaluate timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    ws.addEventListener("error", () => {
      clearTimeout(timeout);
      try {
        ws.close();
      } catch {
        /* ignore */
      }
      reject(new Error("CDP WebSocket error"));
    });

    ws.addEventListener("open", () => {
      ws.send(
        JSON.stringify({
          id: requestId,
          method: "Runtime.evaluate",
          params: {
            expression,
            awaitPromise: true,
            returnByValue: true,
          },
        }),
      );
    });

    ws.addEventListener("message", (event) => {
      try {
        const text = typeof event.data === "string" ? event.data : "";
        if (!text) return;
        const msg = JSON.parse(text) as {
          id?: number;
          result?: {
            result?: { value?: unknown };
            exceptionDetails?: { text?: string; exception?: { description?: string } };
          };
          error?: { message?: string };
        };
        if (msg.id !== requestId) return;
        clearTimeout(timeout);
        if (msg.error) {
          reject(new Error(msg.error.message ?? "CDP error"));
        } else if (msg.result?.exceptionDetails) {
          const ex = msg.result.exceptionDetails;
          reject(new Error(ex.exception?.description ?? ex.text ?? "evaluate exception"));
        } else {
          resolve((msg.result?.result?.value as T) ?? (undefined as T));
        }
      } catch (err) {
        clearTimeout(timeout);
        reject(err instanceof Error ? err : new Error(String(err)));
      } finally {
        try {
          ws.close();
        } catch {
          /* ignore */
        }
      }
    });
  });

  return value;
}

// Public entry: evaluate with a bounded retry on the transient navigation-window
// context error. Thought 2 of the fix — even with the readiness gate below, a
// fresh WebSocket can still land in the gap, so the evaluate itself is resilient.
export async function evaluateInTab<T = unknown>(
  webSocketDebuggerUrl: string,
  expression: string,
  timeoutMs = 15_000,
): Promise<T> {
  const maxAttempts = 3;
  let lastErr: unknown;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await evaluateOnce<T>(webSocketDebuggerUrl, expression, timeoutMs);
    } catch (err) {
      lastErr = err;
      const message = err instanceof Error ? err.message : String(err);
      // Only the navigation-window context error is retryable; a real script
      // exception or timeout is surfaced immediately so we don't hide it.
      if (!TRANSIENT_CONTEXT_ERROR.test(message)) throw err;
      await new Promise((r) => setTimeout(r, 300));
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

// Thought 1 of the fix: a populated URL in /json/list does NOT mean the page
// has a live JS execution context yet. Poll a trivial expression until the page
// answers — swallowing the transient context error — so the real script runs
// only once the main-frame context exists. Prevents the "works on the 2nd try"
// race when findOrOpenChatGptTab had to open a brand-new tab.
export async function waitForExecutionContext(
  webSocketDebuggerUrl: string,
  { timeoutMs = 15_000, intervalMs = 300 }: { timeoutMs?: number; intervalMs?: number } = {},
): Promise<void> {
  const start = Date.now();
  let lastErr: unknown;
  while (Date.now() - start < timeoutMs) {
    try {
      const state = await evaluateOnce<string>(webSocketDebuggerUrl, "document.readyState", 3_000);
      if (state === "interactive" || state === "complete") return;
    } catch (err) {
      // Only the transient navigation-window context error is worth polling
      // through. A genuine failure (WebSocket refused, CDP disabled, …) should
      // fail fast instead of stalling the guardian for the full deadline.
      const message = err instanceof Error ? err.message : String(err);
      if (!TRANSIENT_CONTEXT_ERROR.test(message)) throw err;
      lastErr = err;
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  const detail = lastErr instanceof Error ? `: ${lastErr.message}` : "";
  throw new Error(`ChatGPT tab never exposed a ready execution context${detail}`);
}

export async function findOrOpenChatGptTab(): Promise<CdpTarget> {
  const tabs = await listTabs();
  const existing = tabs.find(isChatGptTab);
  if (existing) return existing;
  const opened = await openNewTab("https://chatgpt.com/");
  // Re-list so we get the up-to-date URL once Chrome has resolved any redirect.
  return opened;
}

export async function waitForTabReady(
  targetId: string,
  predicate: (tab: CdpTarget) => boolean,
  { timeoutMs = 10_000, intervalMs = 400 }: { timeoutMs?: number; intervalMs?: number } = {},
): Promise<CdpTarget | null> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const tabs = await listTabs();
    const tab = tabs.find((t) => t.id === targetId);
    if (tab && predicate(tab)) return tab;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return null;
}

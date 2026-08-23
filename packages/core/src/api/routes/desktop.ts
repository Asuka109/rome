import { Hono } from "hono";
import { createLogger } from "../../logger.js";

const log = createLogger("api:desktop");

const CDP_HOST = process.env.ROME_CHROME_CDP_HOST ?? "127.0.0.1";
const CDP_PORT = Number(process.env.ROME_CHROME_CDP_PORT ?? 9222);
const CDP_REQUEST_TIMEOUT_MS = 5000;

const CHATGPT_URL = "https://chatgpt.com/";

// Hostnames (and their subdomains) that any ChatGPT/Codex login flow can land on.
// We close every tab matching one of these before opening fresh ones, so retries
// and re-opens don't pile up stale auth tabs in the persistent Chrome profile.
const AUTH_TAB_HOST_SUFFIXES = ["chatgpt.com", "openai.com"];

interface CdpTarget {
  id: string;
  type?: string;
  url?: string;
}

async function listTabs(): Promise<CdpTarget[]> {
  try {
    const res = await fetch(`http://${CDP_HOST}:${CDP_PORT}/json/list`, {
      signal: AbortSignal.timeout(CDP_REQUEST_TIMEOUT_MS),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as unknown;
    return Array.isArray(data) ? (data as CdpTarget[]) : [];
  } catch (err) {
    log.warn("CDP list failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    return [];
  }
}

async function closeTab(targetId: string): Promise<boolean> {
  const target = `http://${CDP_HOST}:${CDP_PORT}/json/close/${targetId}`;
  try {
    const res = await fetch(target, {
      signal: AbortSignal.timeout(CDP_REQUEST_TIMEOUT_MS),
    });
    return res.ok;
  } catch (err) {
    log.warn("CDP close failed", {
      targetId,
      error: err instanceof Error ? err.message : String(err),
    });
    return false;
  }
}

function isAuthHost(host: string): boolean {
  const lower = host.toLowerCase();
  return AUTH_TAB_HOST_SUFFIXES.some((suffix) => lower === suffix || lower.endsWith(`.${suffix}`));
}

/**
 * Close every Chrome tab whose URL host matches ChatGPT/OpenAI. Used before
 * opening a fresh login tab, on Retry/Back, and on modal close — so we never
 * leave stale auth tabs lying around the user's persistent profile.
 */
export async function closeAuthTabs(): Promise<number> {
  const tabs = await listTabs();
  let closed = 0;
  for (const tab of tabs) {
    if (tab.type !== "page" || !tab.url) continue;
    let host: string;
    try {
      host = new URL(tab.url).hostname;
    } catch {
      continue;
    }
    if (!isAuthHost(host)) continue;
    if (await closeTab(tab.id)) closed++;
  }
  if (closed > 0) log.info("closed auth tabs", { closed });
  return closed;
}

export async function openServerBrowserTab(
  url: string,
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const target = `http://${CDP_HOST}:${CDP_PORT}/json/new?${encodeURIComponent(url)}`;
  try {
    const res = await fetch(target, {
      method: "PUT",
      signal: AbortSignal.timeout(CDP_REQUEST_TIMEOUT_MS),
    });
    if (res.ok) return { ok: true };
    // Some Chrome builds reject PUT and need GET.
    const fallback = await fetch(target, {
      method: "GET",
      signal: AbortSignal.timeout(CDP_REQUEST_TIMEOUT_MS),
    });
    if (fallback.ok) return { ok: true };
    return { ok: false, status: 502, error: `Chrome CDP responded ${res.status}` };
  } catch (err) {
    log.error("CDP navigate failed", {
      url,
      cdpHost: CDP_HOST,
      cdpPort: CDP_PORT,
      error: err instanceof Error ? err.message : String(err),
    });
    return { ok: false, status: 503, error: "Server browser is not reachable." };
  }
}

export function desktopRoutes(): Hono {
  const app = new Hono();

  app.post("/desktop/navigate-chatgpt", async (c) => {
    await closeAuthTabs();
    const result = await openServerBrowserTab(CHATGPT_URL);
    if (!result.ok) {
      return c.json({ error: result.error }, result.status as 502 | 503);
    }
    return c.json({ ok: true });
  });

  app.post("/desktop/close-auth-tabs", async (c) => {
    const closed = await closeAuthTabs();
    return c.json({ ok: true, closed });
  });

  return app;
}

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchAppApi } from "@rome-os/app-web-sdk";

export type ComposioLoginPhase = "idle" | "starting" | "awaiting";

export interface ComposioLogin {
  phase: ComposioLoginPhase;
  /** The Composio authorization URL while a sign-in is in flight, for a "reopen tab" affordance. */
  loginUrl: string | null;
  /** A transient status/error line to surface to the owner, or null. */
  message: string | null;
  start: () => void;
  cancel: () => void;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * The Composio CLI-driven browser login, as a reusable hook shared by the
 * dashboard sign-in gate and the inline sign-in card. Drives `login/start` →
 * open the authorize tab → poll `login/complete` until the owner authorizes,
 * then invokes `onSignedIn`.
 *
 * It owns the full edge-case dance: a monotonic attempt id so a stale in-flight
 * request can't act on (or restart) a newer sign-in; an abortable + `keepalive`
 * cancel so a backed-out login never persists a key server-side; and bounded
 * transport retries so a dead connection fails visibly instead of spinning
 * forever. `onSignedIn` is read through a ref, so passing a fresh closure each
 * render doesn't reset the in-flight login.
 */
export function useComposioLogin(onSignedIn: () => void): ComposioLogin {
  const [phase, setPhase] = useState<ComposioLoginPhase>("idle");
  const [loginUrl, setLoginUrl] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const onSignedInRef = useRef(onSignedIn);
  onSignedInRef.current = onSignedIn;

  // Monotonic attempt id. Each start()/cancel()/unmount bumps it, which
  // invalidates any poll loop launched by a previous attempt — so a stale
  // in-flight request that resolves late can't act on (or restart) a newer one.
  const attemptRef = useRef(0);
  // The in-flight `login/complete` request, so cancel/unmount can abort it
  // instead of leaving the browser holding the connection.
  const pollAbortRef = useRef<AbortController | null>(null);
  // The cliKey of the active sign-in, sent with `login/cancel` so the server
  // only aborts this run — a late cancel naming an old key is ignored.
  const cliKeyRef = useRef<string | null>(null);

  // Stop any in-flight completion: invalidate the loop, abort the open request,
  // and tell the server to abort the blocking CLI wait so it can't persist a key
  // the owner backed out of. `keepalive` lets the cancel survive a page teardown
  // (tab close/reload), where a normal fetch is dropped. Best-effort by design.
  const stopActiveLogin = useCallback(() => {
    attemptRef.current += 1;
    pollAbortRef.current?.abort();
    pollAbortRef.current = null;
    const cliKey = cliKeyRef.current;
    cliKeyRef.current = null;
    if (!cliKey) return;
    void fetchAppApi("login/cancel", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ cliKey }),
      keepalive: true,
    }).catch(() => {});
  }, []);

  useEffect(() => {
    return () => stopActiveLogin();
  }, [stopActiveLogin]);

  /**
   * Finish login without a manual click. Each `login/complete` request blocks
   * server-side (the CLI's `login --key` polls Composio) until the owner
   * authorizes in the opened tab, then returns the issued key. A timeout comes
   * back as `login_not_authorized` — the owner hasn't finished yet, so we just
   * re-issue the request, re-arming the wait.
   *
   * Two terminal exits: any non-timeout error response is surfaced and drops
   * back to "Sign in"; and a transport failure (server restart, offline) retries
   * with backoff but only up to MAX_TRANSPORT_RETRIES, so a dead connection fails
   * visibly instead of spinning forever.
   */
  const pollComplete = useCallback(
    async (cliKey: string, attempt: number): Promise<void> => {
      const MAX_TRANSPORT_RETRIES = 5;
      let transportRetries = 0;
      while (attemptRef.current === attempt) {
        const ac = new AbortController();
        pollAbortRef.current = ac;
        let res: Response;
        try {
          res = await fetchAppApi("login/complete", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ cliKey }),
            signal: ac.signal,
          });
        } catch {
          // Aborted by cancel/unmount, or a transport blip. The attempt guard
          // covers the former (it was bumped before the abort); otherwise retry.
          if (attemptRef.current !== attempt) return;
          transportRetries += 1;
          if (transportRetries > MAX_TRANSPORT_RETRIES) {
            // Tell the server to abort too: the last fetch may have reached it
            // and be blocking, so without this it could sign in after we gave up.
            stopActiveLogin();
            setPhase("idle");
            setLoginUrl(null);
            setMessage("Lost connection while finishing sign-in. Try again.");
            return;
          }
          await delay(2000 * transportRetries);
          continue;
        }
        transportRetries = 0;
        if (attemptRef.current !== attempt) return;
        const body = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
        if (res.ok) {
          pollAbortRef.current = null;
          cliKeyRef.current = null;
          setPhase("idle");
          setLoginUrl(null);
          onSignedInRef.current();
          return;
        }
        // The owner hasn't authorized within this window yet — keep waiting.
        if (body.error === "login_not_authorized") continue;
        setPhase("idle");
        setLoginUrl(null);
        setMessage(body.message ?? "Sign-in failed. Try again.");
        return;
      }
    },
    [stopActiveLogin],
  );

  const start = useCallback(async (): Promise<void> => {
    setMessage(null);
    const attempt = (attemptRef.current += 1);
    setPhase("starting");
    try {
      const res = await fetchAppApi("login/start", { method: "POST" });
      const body = (await res.json()) as { loginUrl?: string; cliKey?: string; message?: string };
      if (attemptRef.current !== attempt) return;
      if (!res.ok) throw new Error(body.message ?? `login/start: ${res.status}`);
      if (!body.loginUrl || !body.cliKey) throw new Error(body.message ?? "no login URL returned");
      cliKeyRef.current = body.cliKey;
      setLoginUrl(body.loginUrl);
      setPhase("awaiting");
      window.open(body.loginUrl, "_blank", "noopener,noreferrer");
      void pollComplete(body.cliKey, attempt);
    } catch (err) {
      if (attemptRef.current !== attempt) return;
      setPhase("idle");
      setMessage(err instanceof Error ? err.message : String(err));
    }
  }, [pollComplete]);

  const cancel = useCallback(() => {
    stopActiveLogin();
    setPhase("idle");
    setLoginUrl(null);
    setMessage(null);
  }, [stopActiveLogin]);

  return {
    phase,
    loginUrl,
    message,
    // Both stable useCallbacks; the void return type discards start's Promise.
    start,
    cancel,
  };
}

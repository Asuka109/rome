import { useState, useCallback } from "react";

interface UseTailscaleConnectReturn {
  connecting: boolean;
  authUrl: string | null;
  error: string | null;
  /** Trigger `tailscale up`, open Tailscale auth in a new tab. */
  connect: () => Promise<void>;
  /** Clear the auth URL (e.g. after connection succeeds). */
  clearAuthUrl: () => void;
}

export function useTailscaleConnect(onConnected?: () => void): UseTailscaleConnectReturn {
  const [connecting, setConnecting] = useState(false);
  const [authUrl, setAuthUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const connect = useCallback(async () => {
    setConnecting(true);
    setError(null);
    // Open a tab immediately (user gesture) so the browser won't block it
    const popup = window.open("https://tailscale.com/", "_blank");
    try {
      const res = await fetch("/api/tailscale/connect", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        popup?.close();
        setError(data.error || "Failed to connect.");
        return;
      }
      if (data.authUrl) {
        setAuthUrl(data.authUrl);
        if (popup) {
          popup.location.href = data.authUrl;
        }
      } else {
        // Already connected (e.g. re-auth with existing session)
        popup?.close();
        onConnected?.();
      }
    } catch {
      popup?.close();
      setError("Network error. Please try again.");
    } finally {
      setConnecting(false);
    }
  }, [onConnected]);

  const clearAuthUrl = useCallback(() => setAuthUrl(null), []);

  return { connecting, authUrl, error, connect, clearAuthUrl };
}

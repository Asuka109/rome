export type VisitorLoginStartResult = { ok: true } | { ok: false; reason: "start" | "network" };

export async function beginVisitorLogin(
  appId: string,
  next: string = `${window.location.pathname}${window.location.search}${window.location.hash}`,
): Promise<VisitorLoginStartResult> {
  try {
    const res = await fetch("/api/auth/visitor/start", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ appId, next }),
    });
    const data = (await res.json().catch(() => null)) as { authorizeUrl?: string } | null;
    if (!res.ok || !data?.authorizeUrl) return { ok: false, reason: "start" };
    window.location.href = data.authorizeUrl;
    return { ok: true };
  } catch {
    return { ok: false, reason: "network" };
  }
}

export async function beginDashboardVisitorLogin(
  next: string = `${window.location.pathname}${window.location.search}${window.location.hash}`,
): Promise<VisitorLoginStartResult> {
  try {
    const res = await fetch("/api/auth/visitor/start", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scope: "dashboard", next }),
    });
    const data = (await res.json().catch(() => null)) as { authorizeUrl?: string } | null;
    if (!res.ok || !data?.authorizeUrl) return { ok: false, reason: "start" };
    window.location.href = data.authorizeUrl;
    return { ok: true };
  } catch {
    return { ok: false, reason: "network" };
  }
}

const VISITOR_ERROR_REASONS = new Set([
  "state",
  "expired",
  "denied",
  "unconfigured",
  "exchange",
  "malformed",
  "network",
  "forbidden",
]);

export function visitorErrorReasonKey(reason: string | null): string {
  if (reason && VISITOR_ERROR_REASONS.has(reason)) {
    const camel = reason.replace(/_([a-z])/g, (_, ch: string) => ch.toUpperCase());
    return `visitorDashboard.error${camel.charAt(0).toUpperCase()}${camel.slice(1)}`;
  }
  return "visitorDashboard.errorFallback";
}

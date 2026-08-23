export type CloudLoginStartResult = { ok: true } | { ok: false; reason: "start" | "network" };

// Cloud guardian sign-in. Access control: docs/architecture/access-control.md.
// Ask core for the Rome Cloud
// authorize URL and navigate there. On success the browser leaves the SPA
// entirely (full navigation to Rome Cloud, which redirects back to core's
// callback), so this resolves only on failure. Shared by the login and connect
// pages — the same one-trip flow enrolls a vanilla instance and signs an
// already-bound one in.
export async function beginCloudLogin(): Promise<CloudLoginStartResult> {
  try {
    const res = await fetch("/api/auth/cloud/start", {
      method: "POST",
      credentials: "include",
    });
    const data = (await res.json().catch(() => null)) as { authorizeUrl?: string } | null;
    if (!res.ok || !data?.authorizeUrl) return { ok: false, reason: "start" };
    window.location.href = data.authorizeUrl;
    return { ok: true };
  } catch {
    return { ok: false, reason: "network" };
  }
}

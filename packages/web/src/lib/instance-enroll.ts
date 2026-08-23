export type EnrollStartResult = { ok: true } | { ok: false; reason: "start" | "network" };

// Instance enrollment flow. Deployment model: docs/concepts/deployment.md.
// Ask core for the Rome Cloud
// authorize URL and navigate there. On success the browser leaves the SPA
// entirely (full navigation to Rome Cloud, which redirects back to core's
// callback), so this resolves only on failure. Shared by the connect page and
// the settings "reconnect" affordance.
export async function beginInstanceEnroll(): Promise<EnrollStartResult> {
  try {
    const res = await fetch("/api/instance/enroll/start", {
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

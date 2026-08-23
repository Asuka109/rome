/**
 * Match a sub-path under `/api/app-api/<appId>/` against an app's
 * `api.noAuth` declaration.
 *
 * - `noAuth: true` covers every sub-path (the whole app's public API is
 *   unauthenticated).
 * - `noAuth: ["/foo", "/bar/*"]` covers `/foo` exactly and any sub-path
 *   starting with `/bar/`. Use this for apps that expose webhooks or
 *   third-party callbacks alongside authenticated routes.
 * - `noAuth: false` (or unset) — every request needs a session cookie.
 *
 * The Caddy `forward_auth` probe calls `/api/auth/verify` with the
 * original request in `X-Forwarded-Uri`; the verify handler routes
 * `/api/app-api/<appId>/<sub>` through this helper to decide whether
 * to wave the request through. `subPath` is the request path relative
 * to `/api/app-api/<appId>` and must start with `/`; the root request
 * is `/`.
 */
export function isAppApiPathNoAuth(noAuth: boolean | string[], subPath: string): boolean {
  if (noAuth === true) return true;
  if (!Array.isArray(noAuth) || noAuth.length === 0) return false;

  const normalizedPath = subPath === "" ? "/" : subPath.replace(/\/+$/, "") || "/";

  for (const rawPattern of noAuth) {
    const pattern = normalizePattern(rawPattern);
    if (pattern === "*" || pattern === "/*") return true;
    if (pattern.endsWith("/*")) {
      const base = pattern.slice(0, -2) || "/";
      if (normalizedPath === base) return true;
      const prefix = base === "/" ? "/" : `${base}/`;
      if (normalizedPath.startsWith(prefix)) return true;
    } else if (normalizedPath === pattern) {
      return true;
    }
  }
  return false;
}

function normalizePattern(pattern: string): string {
  const withSlash = pattern.startsWith("/") ? pattern : `/${pattern}`;
  if (withSlash === "/") return "/";
  return withSlash.replace(/\/+$/, "");
}

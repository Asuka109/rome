/**
 * Small, shared networking predicates. Domain-free helpers that several packages
 * need to agree on — kept here so the rule can't be applied in one flow and
 * silently missed (or drift) in another.
 */

/**
 * Whether a URL hostname resolves only to the local machine.
 *
 * Covers the loopback literals (`localhost`, `127.0.0.1`, `::1`, and the
 * bracketed `[::1]` that `URL.hostname` yields for an IPv6 literal) plus the
 * RFC 6761 `.localhost` TLD: browsers resolve any `*.localhost` name to loopback
 * before DNS, so a host under it can only be reached on the user's own machine.
 * The dev stack depends on this (`<slug>.rome.localhost` behind Traefik).
 *
 * This is the single loopback-hostname predicate shared by the instance-auth
 * redirect gate, the OAuth callback-origin checks, and the Rome Cloud-origin
 * resolution — so the `.localhost` rule can't be honoured by one and missed by
 * another.
 */
export function isLoopbackHostname(hostname: string): boolean {
  if (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    hostname === "[::1]"
  ) {
    return true;
  }
  return hostname.endsWith(".localhost");
}

/**
 * HACK(zhangfan): whether a hostname is `romeos.dev` or a subdomain of it.
 *
 * romeos.dev is a domain owned for hosting dev Rome instances, fronted by
 * Cloudflare Access — so reaching any `*.romeos.dev` host already requires
 * passing that access gate. The single definition of "is this a romeos.dev host"
 * shared by the instance-auth redirect gate and the OAuth callback-origin checks,
 * so the two can't drift. The leading dot on the suffix stops `evilromeos.dev`
 * from masquerading as romeos.dev.
 *
 * Temporary; remove once romeos.dev is folded into the normal
 * `<slug>.<PANTHEON_DOMAIN>` handling.
 */
export function isRomeosDevHostname(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return host === "romeos.dev" || host.endsWith(".romeos.dev");
}

import { isLoopbackHostname } from "@rome-os/libs/net";

interface RequestLike {
  headers: {
    get(name: string): string | null | undefined;
  };
  url: string;
}

function firstHeaderValue(value: string | null | undefined): string | null {
  if (!value) return null;
  const first = value.split(",")[0]?.trim();
  return first || null;
}

function normalizeProtocol(value: string | null | undefined): "http" | "https" | null {
  const first = firstHeaderValue(value)?.toLowerCase().replace(/:$/, "");
  if (first === "http" || first === "https") return first;
  return null;
}

function normalizeHost(value: string | null | undefined): string | null {
  const first = firstHeaderValue(value)?.toLowerCase();
  if (!first) return null;

  try {
    const parsed = new URL(first.includes("://") ? first : `http://${first}`);
    return parsed.host || null;
  } catch {
    return null;
  }
}

function shouldAssumeHttpsForRomeCloudHost(hostname: string): boolean {
  const romeCloudDomain = process.env.PANTHEON_DOMAIN?.trim()
    .toLowerCase()
    .replace(/^\.+|\.+$/g, "");
  if (!romeCloudDomain || isLoopbackHostname(romeCloudDomain)) return false;

  const normalizedHostname = hostname.toLowerCase();
  return (
    normalizedHostname === romeCloudDomain || normalizedHostname.endsWith(`.${romeCloudDomain}`)
  );
}

export interface ExternalRequestOrigin {
  host: string;
  hostname: string;
  origin: string;
  protocol: "http" | "https";
}

/**
 * The origin an INBOUND request claims to have arrived on, reconstructed from
 * its (proxy-set, spoofable) Host / X-Forwarded-* headers. Use this only to
 * inspect the incoming request — same-origin/CSRF checks and host-binding
 * validation. Do NOT use it to build an origin the instance hands back to an
 * external party (an OAuth redirect_uri, a callback origin): a proxy can rewrite
 * these headers, so the result isn't authoritative. For "where this instance is
 * reachable" use {@link getInstanceOrigin} instead.
 */
export function getExternalRequestOrigin(request: RequestLike): ExternalRequestOrigin {
  const fallbackUrl = new URL(request.url);
  const host =
    normalizeHost(request.headers.get("x-forwarded-host")) ??
    normalizeHost(request.headers.get("host")) ??
    fallbackUrl.host;
  const hostUrl = new URL(`http://${host}`);
  const protocol = shouldAssumeHttpsForRomeCloudHost(hostUrl.hostname)
    ? "https"
    : (normalizeProtocol(request.headers.get("x-forwarded-proto")) ??
      (fallbackUrl.protocol === "https:" ? "https" : "http"));
  const originUrl = new URL(`${protocol}://${host}`);

  return {
    host: originUrl.host,
    hostname: originUrl.hostname,
    origin: originUrl.origin,
    protocol,
  };
}

import { getExternalRequestOrigin } from "./request-origin.js";

interface RequestLike {
  headers: {
    get(name: string): string | null | undefined;
  };
  url: string;
}

function normalizeOrigin(value: string | null | undefined): string | null {
  if (!value) return null;

  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function normalizeFetchSite(
  value: string | null | undefined,
): "same-origin" | "same-site" | "cross-site" | "none" | null {
  const normalized = value?.trim().toLowerCase();
  switch (normalized) {
    case "same-origin":
    case "same-site":
    case "cross-site":
    case "none":
      return normalized;
    default:
      return null;
  }
}

export function isSameOriginMutationRequest(request: RequestLike): boolean {
  // Prefer browser-set Fetch Metadata when available. It survives reverse
  // proxy origin reconstruction issues while still rejecting cross-site calls.
  const fetchSite = normalizeFetchSite(request.headers.get("sec-fetch-site"));
  if (fetchSite === "same-origin") {
    return true;
  }

  const expectedOrigin = getExternalRequestOrigin(request).origin;
  const origin = normalizeOrigin(request.headers.get("origin"));

  if (origin) {
    return origin === expectedOrigin;
  }

  const referer = request.headers.get("referer");
  if (!referer) {
    return false;
  }

  return normalizeOrigin(referer) === expectedOrigin;
}

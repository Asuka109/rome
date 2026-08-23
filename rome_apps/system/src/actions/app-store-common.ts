export interface AppStoreInstalledState {
  appId: string;
  installed: boolean;
  phase: "installed" | "failed" | "broken" | "installing" | "uninstalling" | null;
  enabled: boolean | null;
  installedVersion: string | null;
  sourceMode: "source" | "bundle" | "appstore" | null;
}

export interface AppStoreListing {
  id: string;
  handle: string;
  slug: string;
  name: string | null;
  description: string | null;
  /** Absolute icon URL persisted by the store (S3 object or the store's default icon). */
  iconUrl: string | null;
  /** @deprecated The store API never emitted this; kept so older callers still typecheck. */
  iconPath?: string | null;
  categories: string[];
  installCount: number;
  highestVersion: string;
  verified: boolean;
  updatedAt: string;
  installed?: AppStoreInstalledState;
}

export interface AppStoreVersion {
  version: string;
  contentHash: string;
  sizeBytes: number;
  sourceAvailable: boolean;
  state: "live" | "revoked";
  publishedAt: string;
}

export interface AppStoreListingsBody {
  available: boolean;
  reason?: string;
  error?: string;
  browseOrigin: string | null;
  listings: AppStoreListing[];
  paging?: { limit: number; offset: number; sort: string };
}

export interface AppStoreListingDetailBody {
  available: boolean;
  reason?: string;
  error?: string;
  browseOrigin: string | null;
  listing?: AppStoreListing;
  versions?: AppStoreVersion[];
}

export interface AppStoreServiceResult<T> {
  status: number;
  body: T;
}

export interface AppStoreReader {
  listListings(params?: {
    query?: string;
    sort?: string;
    limit?: number;
    offset?: number;
    includeInstalledState?: boolean;
  }): Promise<AppStoreServiceResult<AppStoreListingsBody>>;
  getListing(params: {
    listingId: string;
    includeInstalledState?: boolean;
  }): Promise<AppStoreServiceResult<AppStoreListingDetailBody>>;
}

export function storeResultError(result: AppStoreServiceResult<{ error?: string }>): string | null {
  if (result.status < 400) return null;
  return result.body.error ?? `Rome App Store request failed with HTTP ${result.status}`;
}

export function chooseLiveVersion(
  detail: AppStoreListingDetailBody,
  requestedVersion?: string,
): AppStoreVersion | null {
  const liveVersions = (detail.versions ?? []).filter((version) => version.state === "live");
  if (liveVersions.length === 0) return null;
  if (requestedVersion) {
    return liveVersions.find((version) => version.version === requestedVersion) ?? null;
  }
  const highest = detail.listing?.highestVersion;
  if (highest) {
    const match = liveVersions.find((version) => version.version === highest);
    if (match) return match;
  }
  return liveVersions[0] ?? null;
}

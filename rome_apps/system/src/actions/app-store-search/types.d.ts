import type {
  AppStoreListing,
  AppStoreListingDetailBody,
  AppStoreListingsBody,
  AppStoreVersion,
} from "../app-store-common.js";

export interface AppStoreSearchInput {
  op?: "search" | "get";
  query?: string;
  listingId?: string;
  sort?: "best" | "recent";
  limit?: number;
  offset?: number;
  includeInstalledState?: boolean;
}

export type AppStoreSearchOutput = AppStoreListingsBody | AppStoreListingDetailBody;

export type { AppStoreListing, AppStoreVersion };

import { createAppLogger, defineAction, z } from "@rome-os/app-runtime";
import type {
  Action,
  ActionConfig,
  ActionResult,
  AppActionRuntimeDeps,
} from "@rome-os/app-runtime";
import type { AppStoreReader } from "../app-store-common.js";
import { storeResultError } from "../app-store-common.js";

const log = createAppLogger("app_store_search");

export interface AppStoreSearchDeps {
  /** Rome App Store read side: real service in main, RPC proxy in workers. */
  appStore: AppStoreReader;
}

export const appStoreSearchInputSchema = z.object({
  op: z
    .enum(["search", "get"])
    .describe(
      "Use 'search' to browse or find Store listings by keyword. Use 'get' to inspect one listing by listingId.",
    )
    .default("search"),
  query: z
    .string()
    .describe(
      "Search keywords, e.g. 'github', 'calendar', 'xiaohongshu'. Leave empty to browse Store listings.",
    )
    .default(""),
  listingId: z
    .string()
    .describe(
      "Required for op='get'. Logical Store listing id, e.g. 'xiaohongshu' or '@handle/slug'.",
    )
    .optional(),
  sort: z
    .enum(["best", "recent"])
    .describe("Optional Store sort key accepted by Rome Cloud: 'best' or 'recent'.")
    .optional(),
  limit: z.number().int().positive().max(50).describe("Max listings to return.").default(10),
  offset: z.number().int().nonnegative().describe("Pagination offset for search.").default(0),
  includeInstalledState: z
    .boolean()
    .describe("Whether to include this Rome instance's installed state for each listing.")
    .default(true),
});

export type AppStoreSearchInput = z.infer<typeof appStoreSearchInputSchema>;

export async function appStoreSearch(
  input: AppStoreSearchInput,
  deps: AppStoreSearchDeps,
): Promise<ActionResult> {
  if (input.op === "get") {
    if (!input.listingId?.trim()) {
      return { status: "error", error: "listingId is required when op='get'." };
    }
    const result = await deps.appStore.getListing({
      listingId: input.listingId.trim(),
      includeInstalledState: input.includeInstalledState,
    });
    const error = storeResultError(result);
    if (error) return { status: "error", error };
    log.info("read app store listing", { listingId: input.listingId });
    return { status: "ok", data: result.body };
  }

  const result = await deps.appStore.listListings({
    query: input.query,
    sort: input.sort,
    limit: input.limit,
    offset: input.offset,
    includeInstalledState: input.includeInstalledState,
  });
  const error = storeResultError(result);
  if (error) return { status: "error", error };
  log.info("searched app store", {
    query: input.query,
    returned: result.body.listings.length,
    available: result.body.available,
  });
  return { status: "ok", data: result.body };
}

export function createAppStoreSearchAction(config: ActionConfig, deps: AppStoreSearchDeps): Action {
  return defineAction({
    config,
    schema: appStoreSearchInputSchema,
    execute: async (input) => appStoreSearch(input, deps),
  });
}

export function createAction(
  config: ActionConfig,
  deps: AppActionRuntimeDeps<AppStoreSearchDeps>,
): Action {
  return createAppStoreSearchAction(config, deps);
}

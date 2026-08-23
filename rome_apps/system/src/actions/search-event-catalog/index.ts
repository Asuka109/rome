import { createAppLogger, defineAction, z } from "@rome-os/app-runtime";
import type {
  Action,
  ActionConfig,
  AppActionRuntimeDeps,
  EventCatalogEntry,
  EventCatalogReader,
} from "@rome-os/app-runtime";

const log = createAppLogger("search-event-catalog");

export interface SearchEventCatalogDeps {
  /** The catalog read side: the real `EventService` in the main process, an
   * `EventCatalogProxy` (RPC to main) in a worker. Injected per process. */
  eventCatalog: EventCatalogReader;
}

export const searchEventCatalogInputSchema = z.object({
  query: z
    .string()
    .describe(
      "Keywords describing the event to watch (e.g. 'gmail new email', 'stripe payment'). Token-OR matched against event type names; leave empty to browse.",
    )
    .default(""),
  limit: z
    .number()
    .int()
    .positive()
    .max(50)
    .describe("Max number of matches to return.")
    .default(10),
});

export type SearchEventCatalogInput = z.infer<typeof searchEventCatalogInputSchema>;

/** Discover the event types an event-bus routine can watch, ranked by relevance
 * to `query` and capped at `limit` so a large catalog never floods the agent's
 * context. Reads the live control-plane catalog in the main process
 * via worker RPC; it is populated as producer apps emit events, so it reflects
 * what's actually subscribable right now rather than a hand-maintained list.
 * `total` is the full match count, so the caller can tell when to narrow. */
export async function searchEventCatalog(
  input: SearchEventCatalogInput,
  deps: SearchEventCatalogDeps,
): Promise<{ events: EventCatalogEntry[]; total: number }> {
  const { entries, total } = await deps.eventCatalog.search(input.query, input.limit);
  log.info("searched event catalog", { query: input.query, returned: entries.length, total });
  return { events: entries, total };
}

export function createSearchEventCatalogAction(
  config: ActionConfig,
  deps: SearchEventCatalogDeps,
): Action {
  return defineAction({
    config,
    schema: searchEventCatalogInputSchema,
    execute: async (input) => {
      const result = await searchEventCatalog(input, deps);
      return { status: "ok", data: result };
    },
  });
}

export function createAction(
  config: ActionConfig,
  deps: AppActionRuntimeDeps<SearchEventCatalogDeps>,
): Action {
  return createSearchEventCatalogAction(config, deps);
}

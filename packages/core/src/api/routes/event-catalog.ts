import { Hono } from "hono";
import { z } from "zod";
import type { ApiDeps } from "../deps.js";
import { catalogEntrySchema } from "../../event-catalog.js";

/** Response contract for GET /event-catalog. Validated at the boundary so a
 * drift between the in-memory store and the wire shape fails loudly. */
export const eventCatalogResponseSchema = z.array(catalogEntrySchema);
export type EventCatalogResponse = z.infer<typeof eventCatalogResponseSchema>;

export function eventCatalogRoutes(deps: ApiDeps): Hono {
  const app = new Hono();

  // Event types producer apps can currently emit. Consumed by routine
  // creation to populate the event-bus trigger picker; empty when no
  // producer is connected.
  app.get("/event-catalog", (c) => {
    const body = eventCatalogResponseSchema.parse(deps.eventCatalog.list());
    return c.json(body);
  });

  return app;
}

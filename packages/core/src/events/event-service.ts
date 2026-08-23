import type { EventCatalogEntry, EventCatalogReader, EventPublisher } from "@rome-os/app-runtime";
import { createLogger } from "../logger.js";
import type { EventBus } from "./event-bus.js";
import { inferPayloadSchema, type EventCatalog } from "../event-catalog.js";

const log = createLogger("event-service");

/**
 * App-facing coordinator over the event subsystem. Publishing a domain event
 * delivers it on the data-plane {@link EventBus} *and* declares its type in the
 * control-plane {@link EventCatalog}; searching reads the catalog.
 *
 * The bus and catalog stay decoupled from each other — the bus is pure delivery
 * and the catalog pure registry. This service is the single place that knows
 * both, so the "publishing also declares the type" rule lives here rather than
 * leaking into either domain object. An action receives it (in the main
 * process) or an {@link EventPublisher}/{@link EventCatalogReader} proxy (in a
 * worker) and cannot tell the difference.
 */
export class EventService implements EventPublisher, EventCatalogReader {
  constructor(
    private readonly bus: EventBus,
    private readonly catalog: EventCatalog,
  ) {}

  async publish(event: {
    name: string;
    source: string;
    payload?: Record<string, unknown>;
  }): Promise<{ accepted: true }> {
    this.bus.publish({
      name: event.name,
      source: event.source,
      payload: event.payload ?? {},
      emittedAt: new Date().toISOString(),
    });
    // A producer declares a watchable event type by emitting it: record it so
    // routine creation can discover what's subscribable. A namespace collision
    // (two sources claiming one type) must not break the publish — log and move
    // on; publishing is the data plane and must never fail on catalog drift.
    try {
      const payloadSchema = inferPayloadSchema(event.payload);
      this.catalog.register({
        eventType: event.name,
        appId: event.source,
        ...(payloadSchema ? { payloadSchema, schemaOrigin: "observed" as const } : {}),
      });
    } catch (err) {
      log.warn("event-catalog registration skipped", {
        eventType: event.name,
        appId: event.source,
        error: err instanceof Error ? err.message : String(err),
      });
    }
    return { accepted: true };
  }

  async search(
    query: string,
    limit: number,
  ): Promise<{ entries: EventCatalogEntry[]; total: number }> {
    return this.catalog.search(query, limit);
  }
}

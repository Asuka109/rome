import { createLogger } from "../logger.js";

const log = createLogger("event-bus");

/** A domain event handed to the in-process bus by some producer (an app via
 * the `events.publish` RPC, or a core subsystem). The bus carries it to every
 * subscriber; it is never persisted. */
export interface BusEvent {
  /** Event type, e.g. "connector.gmail.message_received". */
  name: string;
  /** Who emitted it — appId for app-published events, subsystem name for core. */
  source: string;
  payload: Record<string, unknown>;
  /** ISO 8601 timestamp stamped at publish time. */
  emittedAt: string;
}

export type BusEventHandler = (event: BusEvent) => void;

/**
 * Minimal in-memory pub/sub — the data plane for event-triggered routines.
 * Pure delivery: it holds no routing or matching logic (subscribers filter for
 * themselves) and no buffering (events published with no live subscriber are
 * dropped). Runs entirely on the main process event loop, so no locking.
 */
export class EventBus {
  private handlers = new Set<BusEventHandler>();

  /** Deliver to every current subscriber. One throwing handler must not starve
   * the others, so each call is isolated. Returns synchronously. */
  publish(event: BusEvent): void {
    for (const handler of this.handlers) {
      try {
        handler(event);
      } catch (err) {
        log.error("event bus subscriber threw", {
          eventName: event.name,
          source: event.source,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }

  subscribe(handler: BusEventHandler): () => void {
    this.handlers.add(handler);
    return () => {
      this.handlers.delete(handler);
    };
  }
}

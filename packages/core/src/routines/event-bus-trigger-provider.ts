import type { TriggerProvider } from "./trigger-provider.js";
import type { EventBusTrigger, EventFilterCondition, Routine } from "./types.js";
import type { BusEvent, EventBus } from "../events/event-bus.js";
import { createLogger } from "../logger.js";

const log = createLogger("event-bus-trigger");

interface Registration {
  routine: Routine;
  fire: (payload: Record<string, unknown>) => Promise<void>;
}

/**
 * Fires routines whose `event-bus` trigger matches a published {@link BusEvent}.
 * Subscribes to the bus once (on first activate) and routes each event to the
 * registered routines — the bus itself does no matching.
 *
 * A matching routine's action is fired without awaiting completion: a slow
 * downstream action must not stall the publisher's `events.publish` RPC. The
 * RoutineEngine persists each run and owns retry, so durability lives there.
 */
export class EventBusTriggerProvider implements TriggerProvider {
  readonly type = "event-bus";
  private registrations = new Map<string, Registration>();
  private unsubscribe: (() => void) | null = null;

  constructor(private bus: EventBus) {}

  async activate(
    routine: Routine,
    fire: (payload: Record<string, unknown>) => Promise<void>,
  ): Promise<void> {
    this.ensureSubscribed();
    this.registrations.set(routine.id, { routine, fire });
    log.info("event-bus trigger activated", {
      routineId: routine.id,
      name: routine.name,
      eventName: (routine.trigger as EventBusTrigger).eventName,
    });
  }

  deactivate(routineId: string): void {
    this.registrations.delete(routineId);
  }

  isActive(routineId: string): boolean {
    return this.registrations.has(routineId);
  }

  stop(): void {
    this.registrations.clear();
    this.unsubscribe?.();
    this.unsubscribe = null;
  }

  private ensureSubscribed(): void {
    if (this.unsubscribe) return;
    this.unsubscribe = this.bus.subscribe((event) => this.onEvent(event));
  }

  private onEvent(event: BusEvent): void {
    for (const { routine, fire } of this.registrations.values()) {
      const trigger = routine.trigger as EventBusTrigger;
      if (trigger.eventName !== event.name) continue;
      if (trigger.sourcePattern && !matchesSource(trigger.sourcePattern, event.source)) {
        continue;
      }
      if (trigger.filter && !matchesFilter(trigger.filter, event.payload)) {
        continue;
      }
      // Fire-and-forget: the engine records the run and retries on failure.
      void fire(event.payload).catch((err) => {
        log.error("event-bus routine fire failed", {
          routineId: routine.id,
          name: routine.name,
          eventName: event.name,
          error: err instanceof Error ? err.message : String(err),
        });
      });
    }
  }
}

/** Exact match, or a single `*` wildcard standing for any run of characters
 * (e.g. `connector*`, `*gmail*`, `connector.*.received`). */
export function matchesSource(pattern: string, source: string): boolean {
  if (!pattern.includes("*")) return pattern === source;
  const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\\\*/g, ".*");
  return new RegExp(`^${escaped}$`).test(source);
}

/** Every condition must hold (AND). A condition holds when the payload value at
 * its dot-path, coerced with String(), equals the condition's `equals`. A
 * missing path never equals a string, so an absent field fails the condition. */
export function matchesFilter(
  conditions: EventFilterCondition[],
  payload: Record<string, unknown>,
): boolean {
  return conditions.every((c) => {
    const value = readPath(payload, c.field);
    if (value === undefined || value === null) return false;
    return String(value) === c.equals;
  });
}

function readPath(obj: Record<string, unknown>, path: string): unknown {
  let current: unknown = obj;
  for (const key of path.split(".")) {
    if (current === null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

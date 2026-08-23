import type { Routine } from "./types.js";

/**
 * A TriggerProvider watches for a specific trigger type and calls `fire`
 * when the trigger condition is met.
 */
export interface TriggerProvider {
  readonly type: string;

  /** Start watching for this routine's trigger. Resolves once persistent
   * activation state (e.g. nextRunAt) has been committed. */
  activate(
    routine: Routine,
    fire: (payload: Record<string, unknown>) => Promise<void>,
  ): Promise<void>;

  /** Stop watching for a specific routine. */
  deactivate(routineId: string): void;

  /** True when the provider is currently watching this routine — i.e.
   * a fire on its trigger would invoke the registered callback. Used by the
   * engine + admin surfaces to distinguish "scheduled" from "orphaned" rows. */
  isActive(routineId: string): boolean;

  /** Cleanup all watchers. */
  stop(): void;
}

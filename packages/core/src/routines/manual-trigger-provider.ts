import type { TriggerProvider } from "./trigger-provider.js";
import type { Routine } from "./types.js";
import { createLogger } from "../logger.js";

const log = createLogger("manual-trigger");

/**
 * Provider for `manual` triggers — routines that never fire on their own.
 *
 * There is no condition to watch: `activate` only records the routine as active
 * (so admin surfaces can tell a ready manual routine from an orphaned row whose
 * trigger type has no provider) and deliberately never calls `fire`. The single
 * way a manual routine runs is the engine's out-of-band `runNow()` path, which
 * dispatches directly without consulting any provider.
 */
export class ManualTriggerProvider implements TriggerProvider {
  readonly type = "manual";
  private active = new Set<string>();

  async activate(
    routine: Routine,
    _fire: (payload: Record<string, unknown>) => Promise<void>,
  ): Promise<void> {
    this.active.add(routine.id);
    log.info("manual trigger activated", { routineId: routine.id, name: routine.name });
  }

  deactivate(routineId: string): void {
    this.active.delete(routineId);
  }

  isActive(routineId: string): boolean {
    return this.active.has(routineId);
  }

  stop(): void {
    this.active.clear();
  }
}

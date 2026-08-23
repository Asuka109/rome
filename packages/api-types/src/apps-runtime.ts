import type { AppViewState, RomeAppRuntimeStatus } from "./apps.js";

/** Maps persisted and transitional app states to the dashboard's runtime status. */
export function deriveAppRuntimeStatus(
  phase: AppViewState,
  enabled: boolean,
): RomeAppRuntimeStatus {
  switch (phase) {
    case "installed":
    case "installing":
    case "uninstalling":
      return enabled ? "active" : "disabled";
    case "failed":
    case "broken":
      return "failed";
    default: {
      const _exhaustive: never = phase;
      throw new Error(`deriveAppRuntimeStatus: unknown phase "${String(_exhaustive)}"`);
    }
  }
}

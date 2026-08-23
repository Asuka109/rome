import { callAction } from "./call-action.js";
import type { ActionConfig, ActionResult, Action } from "./types.js";

export abstract class BaseAction implements Action {
  constructor(
    public readonly config: ActionConfig,
    public readonly inputSchema?: Record<string, unknown>,
  ) {}

  abstract execute(args: Record<string, unknown>): Promise<ActionResult>;

  /** Call another action through the engine (journaled + approval-gated). */
  protected call(actionName: string, args: Record<string, unknown>): Promise<ActionResult> {
    return callAction(actionName, args);
  }
}

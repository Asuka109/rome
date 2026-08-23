import type { ActionRunContext } from "./engine.js";
import type { ActionRuntimeEvent } from "./runtime-events.js";
import type { ActionResult } from "./types.js";

export interface ActionWorkerPayload {
  actionName: string;
  args: Record<string, unknown>;
  context: ActionRunContext;
  /**
   * W3C Trace Context carrier (typically `{ traceparent, tracestate? }`)
   * serialized via `propagation.inject` from the parent's active span.
   * The worker calls `propagation.extract` and runs the action body under
   * the resulting context so its `agent:*` / `model.turn` spans nest under
   * the parent `action:*` span instead of starting a new disconnected trace.
   */
  traceCarrier?: Record<string, string>;
  /**
   * Epoch-ms the parent stamped immediately before `child.send()`. The worker
   * subtracts it from its own clock on entry to record `rome.action.worker.startup`
   * (the fork → body cold-start, dominated by Node/tsx module eval). Optional so
   * an older parent still runs; the worker no-ops the timing when absent.
   */
  forkStartedAt?: number;
}

export interface ActionWorkerReady {
  type: "ready";
}

export interface ActionWorkerShutdown {
  type: "shutdown";
}

export interface ActionWorkerSuccess {
  type: "result";
  result: ActionResult;
}

export interface ActionWorkerFailure {
  type: "error";
  /**
   * Serialized form of the error thrown in the worker. `name` and `message`
   * are carried separately so the parent can reconstruct an `Error` whose
   * identity matches what an in-process caller would have seen — IPC cannot
   * ship the instance itself.
   */
  error: { name: string; message: string };
}

export interface ActionWorkerRuntimeEvent {
  type: "runtime_event";
  event: ActionRuntimeEvent;
}

export type ActionWorkerMessage =
  | ActionWorkerReady
  | ActionWorkerSuccess
  | ActionWorkerFailure
  | ActionWorkerRuntimeEvent;

export function isActionWorkerMessage(message: unknown): message is ActionWorkerMessage {
  if (typeof message !== "object" || message === null) return false;
  const type = (message as { type?: unknown }).type;
  return type === "ready" || type === "result" || type === "error" || type === "runtime_event";
}

export function isActionWorkerPayload(message: unknown): message is ActionWorkerPayload {
  if (typeof message !== "object" || message === null) return false;
  const value = message as Partial<ActionWorkerPayload>;
  return (
    typeof value.actionName === "string" &&
    typeof value.args === "object" &&
    value.args !== null &&
    typeof value.context === "object" &&
    value.context !== null
  );
}

export function isActionWorkerShutdown(message: unknown): message is ActionWorkerShutdown {
  return (
    typeof message === "object" &&
    message !== null &&
    (message as { type?: unknown }).type === "shutdown"
  );
}

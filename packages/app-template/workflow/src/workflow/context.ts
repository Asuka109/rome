// App-owned workflow context; the SDK deliberately carries no workflow runtime.

export type Json = unknown;

export interface WorkflowContext {
  runAction(canonicalId: string, args: Record<string, unknown>): Promise<Json>;
  log: {
    info(message: string, data?: Record<string, unknown>): void;
    warn(message: string, data?: Record<string, unknown>): void;
  };
  /** True on a verification/preview run. Code that writes to the outside world
   * must short-circuit when this is set. */
  dryRun: boolean;
}

/** Returns a display envelope with a human-readable `message`; `ok: false` means no result. */
export type WorkflowFn = (input: Json, ctx: WorkflowContext) => Json | Promise<Json>;

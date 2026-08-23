// The workflow runtime context — owned by the app, not the SDK.
//
// A workflow app's behaviour is plain author-written code in `definition.ts`:
// a single `runWorkflow(input, ctx)` function that implements its own control
// flow in ordinary TypeScript and reaches reusable work through `ctx`. This file
// is the shell-side glue that the run action builds and hands to that function —
// it lives in the app so the SDK carries no workflow runtime at all.

export type Json = unknown;

/** What a workflow's code can reach: the action runner (using canonical ids,
 * including `system:summon`) and a logger. */
export interface WorkflowContext {
  runAction(canonicalId: string, args: Record<string, unknown>): Promise<Json>;
  log: {
    info(message: string, data?: Record<string, unknown>): void;
    warn(message: string, data?: Record<string, unknown>): void;
  };
  /** True on a verification/preview run. Code that writes to the outside world
   * (sends a message, posts to a SaaS API) must short-circuit when this is set,
   * so building or testing a workflow never performs a real external write. The
   * run action threads it unchanged into `runWorkflow`. */
  dryRun: boolean;
}

/** A workflow definition: transform `input`, implementing all control flow inline,
 * reaching reusable work through `ctx`. The run action calls it directly. */
export type WorkflowFn = (input: Json, ctx: WorkflowContext) => Json | Promise<Json>;

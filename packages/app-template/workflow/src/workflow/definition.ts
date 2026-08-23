import { type Json, type WorkflowContext } from "./context.js";

// Replace this function with the workflow. Use `ctx.runAction` for reusable work,
// guard external writes with `ctx.dryRun`, and return a human-readable `message`.
// Set `ok: false` when the workflow finds nothing useful.
export async function runWorkflow(input: Json, ctx: WorkflowContext): Promise<Json> {
  ctx.log.info("workflow ran", { input });
  return {
    ok: true,
    message:
      "**It works.** This starter ran successfully.\n\nReplace `runWorkflow` with the real " +
      "steps, and return a `message` that describes the outcome in plain language.",
  };
}

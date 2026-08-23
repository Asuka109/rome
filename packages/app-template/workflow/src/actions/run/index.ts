import {
  createAppLogger,
  defineAction,
  z,
  type Action,
  type ActionConfig,
  type AppActionRuntimeDeps,
} from "@rome-os/app-runtime";
import { runWorkflow } from "../../workflow/definition.js";
import { type WorkflowContext } from "../../workflow/context.js";
import { createRunsRepository } from "../../db/repositories/runs.js";

const log = createAppLogger("__APP_ID__:run");

const schema = z.object({
  input: z
    .unknown()
    .optional()
    .describe("Initial value passed to the workflow's first step; omit for a no-input run"),
  dryRun: z
    .boolean()
    .optional()
    .default(false)
    .describe(
      "Verification/preview run: external-write steps no-op instead of performing real writes",
    ),
});

export function createAction(config: ActionConfig, deps: AppActionRuntimeDeps): Action {
  const { appContext } = deps;

  return defineAction({
    config,
    schema,
    execute: async ({ input, dryRun }) => {
      // The workflow reaches reusable work through the action runner. A failed
      // sub-action throws, so the workflow's `await ctx.runAction(...)` surfaces
      // the error and fails the run rather than silently returning a non-success
      // result.
      const ctx: WorkflowContext = {
        runAction: async (canonicalId, args) => {
          const res = await appContext.runAction(canonicalId, args);
          if (res.status !== "ok") {
            throw new Error(
              res.status === "error" ? res.error : `${canonicalId} returned ${res.status}`,
            );
          }
          return res.data;
        },
        log,
        dryRun,
      };

      // Record the run in the app's own run-history table (start now, close on
      // exit). This is shell bookkeeping the workflow never sees, so EVERY DB
      // touch is best-effort: a missing table or a locked DB must not turn a
      // working run into a hard failure. `runId` stays null if the start write
      // fails, and `finish` is skipped for it.
      const runs = createRunsRepository(appContext.db);
      let runId: string | null = null;
      try {
        runId = runs.start(input ?? null, dryRun);
      } catch (recErr) {
        log.warn("failed to record run start", {
          error: recErr instanceof Error ? recErr.message : String(recErr),
        });
      }

      try {
        const result = await runWorkflow(input ?? null, ctx);
        log.info("workflow run completed");
        if (runId) {
          try {
            runs.finish(runId, { status: "success", result });
          } catch (recErr) {
            log.warn("failed to record run result", {
              error: recErr instanceof Error ? recErr.message : String(recErr),
            });
          }
        }
        return { status: "ok", data: result };
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        log.warn("workflow run failed", { error });
        if (runId) {
          try {
            runs.finish(runId, { status: "error", error });
          } catch (recErr) {
            log.warn("failed to record run failure", {
              error: recErr instanceof Error ? recErr.message : String(recErr),
            });
          }
        }
        return { status: "error", error };
      }
    },
  });
}

import { createAppLogger } from "@rome-os/app-runtime";
import type {
  Action,
  ActionConfig,
  AppActionRuntimeDeps,
  BackendTurnRunner,
} from "@rome-os/app-runtime";

const log = createAppLogger("resume-session");

// ---------------------------------------------------------------------------
// Dependencies injected via factory
// ---------------------------------------------------------------------------

export interface ResumeSessionDeps {
  /** Real orchestrator in the main process, RPC-backed proxy in the worker. */
  backendTurnRunner: BackendTurnRunner;
}

type RuntimeDeps = AppActionRuntimeDeps<ResumeSessionDeps>;

// ---------------------------------------------------------------------------
// resume_session (Step 1)
// ---------------------------------------------------------------------------
//
// A thin worker-side shim: a defer one-off routine fires this; it forwards a
// single `runAndDeliver` to the main-process backend-turn orchestrator, which
// owns running the turn and the per-channel reply delivery. No channel branch
// and no trust pipeline here — both live where they belong (the orchestrator
// and the inbound handlers respectively).

export function createResumeSessionAction(config: ActionConfig, deps: RuntimeDeps): Action {
  return {
    config,
    // No inputSchema: fired only by the defer one-off routine, never agent-callable.
    async execute(args: Record<string, unknown>) {
      const channel = typeof args.channel === "string" ? args.channel : "";
      const threadId = typeof args.threadId === "string" ? args.threadId : "";
      const prompt = typeof args.text === "string" ? args.text : "";
      if (!channel || !threadId) {
        return { status: "error" as const, error: "resume_session requires channel and threadId" };
      }
      // `agentName` is always set by `buildResumeArgs`; a missing value means a
      // serialization bug upstream. Fail fast rather than silently resume the
      // wrong agent (wrong thread context, wrong tool catalog).
      if (typeof args.agentName !== "string" || !args.agentName.trim()) {
        return { status: "error" as const, error: "resume_session requires agentName" };
      }
      const agentName = args.agentName.trim();
      const sessionId = typeof args.sessionId === "string" ? args.sessionId.trim() : "";
      if (!sessionId) {
        return {
          status: "error" as const,
          error: "resume_session requires sessionId",
        };
      }

      try {
        await deps.backendTurnRunner.runAndDeliver({
          agentName,
          sessionId,
          channel,
          threadId,
          channelUserId: typeof args.channelUserId === "string" ? args.channelUserId : undefined,
          prompt,
        });
        return { status: "ok" as const, data: { action: "resumed", channel, threadId } };
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        log.error("resume_session failed", { channel, threadId, error });
        return { status: "error" as const, error };
      }
    },
  };
}

export function createAction(config: ActionConfig, deps: RuntimeDeps): Action {
  // Fail the load at boot (not on first fire) if the orchestrator is unwired.
  if (typeof deps.backendTurnRunner?.runAndDeliver !== "function") {
    throw new Error("resume_session requires a backendTurnRunner dep with runAndDeliver()");
  }
  return createResumeSessionAction(config, deps);
}

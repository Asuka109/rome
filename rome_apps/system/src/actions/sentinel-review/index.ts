import type {
  Action,
  ActionConfig,
  ActionResult,
  AgentRunnerInterface,
  SentinelLogRepository,
} from "@rome-os/app-runtime";

// ---------------------------------------------------------------------------
// Dependencies injected via factory
// ---------------------------------------------------------------------------

export interface SentinelReviewDeps {
  agentRunner: AgentRunnerInterface;
  sentinelLogRepo: SentinelLogRepository;
}

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

interface SentinelLogEntry {
  id: string;
  channel: string;
  channelUserId: string;
  displayName: string | null;
  text: string | null;
  action: string;
  response: string | null;
  createdAt: Date;
}

function formatSentinelLog(entries: SentinelLogEntry[]): string {
  return entries
    .map((e, i) => {
      const lines = [
        `${i + 1}. [${e.action.toUpperCase()}] ${e.displayName ?? e.channelUserId} on ${e.channel} (${e.createdAt.toISOString()})`,
      ];
      if (e.text) lines.push(`   Message: ${e.text}`);
      if (e.response) lines.push(`   Response: ${e.response}`);
      return lines.join("\n");
    })
    .join("\n\n");
}

// ---------------------------------------------------------------------------
// Factory: createSentinelReviewAction
// ---------------------------------------------------------------------------

export function createSentinelReviewAction(config: ActionConfig, deps: SentinelReviewDeps): Action {
  return {
    config,
    // No inputSchema — not agent-callable
    async execute(): Promise<ActionResult> {
      const unreviewed = await deps.sentinelLogRepo.findUnreviewed();
      if (unreviewed.length === 0) {
        return { status: "ok", data: { reviewed: 0 } };
      }

      const summary = formatSentinelLog(unreviewed);

      for await (const msg of deps.agentRunner.run({
        agentName: "main",
        prompt: `Review these sentinel decisions and take any needed action:\n\n${summary}`,
      })) {
        // Process main agent's review (logging, side-effects handled by the agent)
      }

      await deps.sentinelLogRepo.markReviewed(unreviewed.map((e) => e.id));
      return { status: "ok", data: { reviewed: unreviewed.length } };
    },
  };
}

export function createAction(config: ActionConfig, deps: SentinelReviewDeps): Action {
  return createSentinelReviewAction(config, deps);
}

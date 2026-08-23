import { createAppLogger } from "@rome-os/app-runtime";
import type {
  Action,
  ActionConfig,
  ActionResult,
  AppActionRuntimeDeps,
} from "@rome-os/app-runtime";
import { createScoutsRepository } from "../../db/repositories/scouts.js";
import { normalizeIntervalMinutes, intervalLabel } from "../../lib/interval.js";
import { unwrap } from "../../lib/action-result.js";

const log = createAppLogger("briefing_add_scout");

interface AddScoutInput {
  title?: string;
  prompt?: string;
  intervalMinutes?: number;
  enabled?: boolean;
}

export function createAction(config: ActionConfig, deps: AppActionRuntimeDeps): Action {
  const { appContext } = deps;
  return {
    config,
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Short label for the scouting task" },
        prompt: {
          type: "string",
          description:
            "The full, detailed prompt the assistant agent runs as its task each interval. Be specific about what to look for and how to report it.",
        },
        intervalMinutes: {
          type: "number",
          description:
            "How often to run, in minutes. Supported: 15, 30, 60, 120, 180, 360, 720, 1440 (snaps to the nearest). Default 360 (every 6 hours).",
        },
        enabled: {
          type: "boolean",
          description: "Whether the scout runs on its schedule. Default true.",
        },
      },
      required: ["title", "prompt"],
      additionalProperties: false,
    },
    execute: async (input: Record<string, unknown>): Promise<ActionResult> => {
      const { title, prompt, intervalMinutes, enabled } = input as AddScoutInput;
      if (typeof title !== "string" || !title.trim()) {
        return { status: "error", error: "A scouting task needs a title." };
      }
      if (typeof prompt !== "string" || !prompt.trim()) {
        return { status: "error", error: "A scouting task needs a detailed prompt." };
      }
      const minutes = normalizeIntervalMinutes(intervalMinutes ?? 360);

      const repo = createScoutsRepository(appContext.db);
      const scout = await repo.insert({
        title: title.trim().slice(0, 120),
        prompt: prompt.trim(),
        intervalMinutes: minutes,
        enabled: enabled ?? true,
      });

      // Schedule its routine.
      const sync = unwrap(await appContext.runAction("briefing_sync_routines", {}));
      if (!sync.ok) {
        log.warn("scout created but routine sync failed", { error: sync.error });
      }

      log.info("scout added", { id: scout.id, title: scout.title, minutes });
      return {
        status: "ok",
        data: {
          scout,
          intervalLabel: intervalLabel(minutes),
          scheduled: sync.ok,
          message: `Added scouting task "${scout.title}" — runs ${intervalLabel(minutes).toLowerCase()}.`,
        },
      };
    },
  };
}

import { createAppLogger } from "@rome-os/app-runtime";
import type {
  Action,
  ActionConfig,
  ActionResult,
  AppActionRuntimeDeps,
} from "@rome-os/app-runtime";
import { createBriefsRepository } from "../../db/repositories/briefs.js";
import {
  createScoutResultsRepository,
  type ScoutResult,
} from "../../db/repositories/scout-results.js";
import { createSettingsRepository, type BriefingSettings } from "../../db/repositories/settings.js";
import { isSupportedChannel, channelSetupHint } from "../../lib/channels.js";
import { unwrap, summonText } from "../../lib/action-result.js";

const log = createAppLogger("briefing_run_brief");

interface RunBriefInput {
  kind?: string;
  deliver?: boolean;
}

function nowLabel(tz: string): { date: string; time: string } {
  const d = new Date();
  const date = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(d);
  const time = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(d);
  return { date, time };
}

function describeScoutResults(results: ScoutResult[]): string {
  if (results.length === 0) return "(No new scouting findings since the last brief.)";
  return results
    .map((r) => `### ${r.scoutTitle}\n${(r.content ?? "").trim() || "(no findings)"}`)
    .join("\n\n");
}

function buildPrompt(kind: string, tz: string, results: ScoutResult[]): string {
  const { date, time } = nowLabel(tz);
  const isMorning = kind === "morning";
  const windowHint = isMorning
    ? "Focus on what matters for the day ahead: today's calendar events, anything overnight that needs a reply, and what to prioritize."
    : "Focus on wrapping up the day: what happened, anything still needing a response tonight, and what's on tomorrow's calendar.";
  return [
    `You are preparing the guardian's ${kind === "test" ? "briefing (test run)" : `${kind} brief`}.`,
    `Local date: ${date}. Local time: ${time} (${tz}).`,
    "",
    "Assemble a concise, well-structured briefing in markdown. Gather from these sources, using whatever tools and actions you have:",
    "",
    "1. CALENDAR — check the guardian's Google Calendar for relevant events (today, and tomorrow morning for an evening brief).",
    "2. MESSAGES — check recent messages on connected channels: WhatsApp (use fetch_channel_history) and email (Gmail). Surface only what needs attention or a reply; summarize, don't dump.",
    "3. SCOUTING FINDINGS — the findings below were already gathered by scheduled scouting tasks. Integrate the key points.",
    "",
    "ROBUSTNESS: Some sources may not be connected. If a source is unavailable, errors, or has nothing relevant, skip it gracefully and add a brief one-line note like '_Calendar not connected._' — NEVER fail or refuse the whole brief because one source is missing.",
    "",
    windowHint,
    "",
    "FORMAT: Start with a one-line greeting and date. Then short sections, each with a bold header on its own line, in this order: **Summary** (a 2–3 sentence executive summary of the day), **Action Items** (a short prioritized to-do list — one concrete action per bullet, most urgent first), then **Calendar**, **Messages**, **Scouting**. Keep it skimmable and tight. Return ONLY the briefing markdown.",
    "",
    "--- SCOUTING FINDINGS SINCE LAST BRIEF ---",
    describeScoutResults(results),
  ].join("\n");
}

function fallbackBrief(kind: string, tz: string, results: ScoutResult[]): string {
  const { date } = nowLabel(tz);
  const heading =
    kind === "test" ? "Briefing (test)" : `${kind[0].toUpperCase()}${kind.slice(1)} brief`;
  const lines = [`**${heading}** — ${date}`, ""];
  if (results.length > 0) {
    lines.push("**Scouting**", "", describeScoutResults(results));
  } else {
    lines.push("_No new scouting findings, and live sources could not be reached for this brief._");
  }
  return lines.join("\n");
}

async function deliver(
  appContext: AppActionRuntimeDeps["appContext"],
  settings: BriefingSettings,
  kind: string,
  content: string,
): Promise<{ delivered: boolean; channel: string; deliveryError?: string }> {
  const channel = settings.channel;
  if (!isSupportedChannel(channel)) {
    return {
      delivered: false,
      channel,
      deliveryError: `Unsupported delivery channel "${channel}". ${channelSetupHint(channel)}`,
    };
  }

  const { date } = nowLabel(settings.timezone || "UTC");
  const subject =
    kind === "test"
      ? `Briefing test — ${date}`
      : `${kind[0].toUpperCase()}${kind.slice(1)} brief — ${date}`;

  let args: Record<string, unknown>;
  if (channel === "whatsapp") {
    // Prefer the platform's guardian resolution (to: "guardian"), which maps to
    // the guardian's WhatsApp chat automatically. An explicitly configured chat
    // id still overrides it for sending to a non-guardian thread.
    const explicitThread = settings.whatsappThreadId.trim();
    args = explicitThread
      ? { channel: "whatsapp", threadId: explicitThread, text: content }
      : { channel: "whatsapp", to: "guardian", text: content };
  } else {
    args = {
      channel: "email",
      to: settings.emailTo.trim() || "guardian",
      subject,
      text: content,
    };
  }

  try {
    const res = unwrap(await appContext.runAction("send_message", args));
    if (res.ok) return { delivered: true, channel };
    return {
      delivered: false,
      channel,
      deliveryError: `${res.error}. ${channelSetupHint(channel)}`,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { delivered: false, channel, deliveryError: `${msg}. ${channelSetupHint(channel)}` };
  }
}

export function createAction(config: ActionConfig, deps: AppActionRuntimeDeps): Action {
  const { appContext } = deps;
  return {
    config,
    inputSchema: {
      type: "object",
      properties: {
        kind: {
          type: "string",
          enum: ["morning", "evening", "test"],
          description: "Which brief to run. Default test.",
        },
        deliver: {
          type: "boolean",
          description: "Whether to send the brief to the configured channel. Default true.",
        },
      },
      additionalProperties: false,
    },
    execute: async (input: Record<string, unknown>): Promise<ActionResult> => {
      const { kind: rawKind, deliver: rawDeliver } = input as RunBriefInput;
      const kind =
        rawKind === "morning" || rawKind === "evening" || rawKind === "test" ? rawKind : "test";
      const shouldDeliver = rawDeliver !== false;

      const settings = await createSettingsRepository(appContext.db).get();
      const tz = settings.timezone || "UTC";
      const resultsRepo = createScoutResultsRepository(appContext.db);
      const briefsRepo = createBriefsRepository(appContext.db);

      const scoutResults = await resultsRepo.listUnconsumed();
      const briefId = await briefsRepo.start(kind);

      // Synthesize the brief via the assistant agent; fall back deterministically.
      let content = "";
      let usedFallback = false;
      try {
        const summoned = unwrap(
          await appContext.runAction("summon", {
            agentName: "assistant",
            prompt: buildPrompt(kind, tz, scoutResults),
          }),
        );
        if (summoned.ok) content = summonText(summoned.data);
        else log.warn("brief summon failed", { error: summoned.error });
      } catch (err) {
        log.warn("brief summon threw", { error: err instanceof Error ? err.message : String(err) });
      }
      if (!content) {
        content = fallbackBrief(kind, tz, scoutResults);
        usedFallback = true;
      }

      // Deliver (best-effort). The brief content is always stored regardless.
      let delivery: { delivered: boolean; channel: string; deliveryError?: string } = {
        delivered: false,
        channel: settings.channel,
      };
      if (shouldDeliver) {
        delivery = await deliver(appContext, settings, kind, content);
      }

      // Real scheduled briefs consume the scout findings so the next brief
      // doesn't repeat them. A test run leaves them for the real brief.
      if (kind !== "test") {
        await resultsRepo.markConsumed(scoutResults.map((r) => r.id));
      }

      await briefsRepo.finish(briefId, {
        status: "completed",
        content,
        channel: delivery.channel,
        delivered: delivery.delivered,
        deliveryError: delivery.deliveryError,
        scoutResultCount: scoutResults.length,
      });

      log.info("brief completed", {
        kind,
        delivered: delivery.delivered,
        scoutResults: scoutResults.length,
        usedFallback,
      });

      return {
        status: "ok",
        data: {
          briefId,
          kind,
          content,
          channel: delivery.channel,
          delivered: delivery.delivered,
          deliveryError: delivery.deliveryError,
          scoutResultCount: scoutResults.length,
          usedFallback,
        },
      };
    },
  };
}

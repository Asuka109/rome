import { createAppLogger } from "@rome-os/app-runtime";
import type {
  Action,
  ActionConfig,
  ActionResult,
  AppActionRuntimeDeps,
} from "@rome-os/app-runtime";
import { createScoutsRepository } from "../../db/repositories/scouts.js";
import { createSettingsRepository } from "../../db/repositories/settings.js";
import { intervalToTrigger, type ScheduleTrigger } from "../../lib/interval.js";
import { unwrap } from "../../lib/action-result.js";

const log = createAppLogger("briefing_sync_routines");

const MANAGED_PREFIX = "briefing-";

interface DesiredRoutine {
  /** Stable identity used to claim + recreate this routine (the `briefing-`
   * prefix is how we find the ones we own). Distinct from `name`. */
  key: string;
  /** Human-readable title shown to the guardian in the routines UI. */
  name: string;
  enabled: boolean;
  trigger: ScheduleTrigger;
  actionName: string;
  args: Record<string, unknown>;
}

const TIME_RE = /^\d{2}:\d{2}$/;

export function createAction(config: ActionConfig, deps: AppActionRuntimeDeps): Action {
  const { appContext } = deps;
  return {
    config,
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    execute: async (): Promise<ActionResult> => {
      // Routines briefing creates here are auto-attributed to briefing by the
      // runtime (from action ownership), so users can't delete them out from
      // under the sync — and briefing deletes its own simply by being the caller.
      const settings = await createSettingsRepository(appContext.db).get();
      const scouts = await createScoutsRepository(appContext.db).list();
      const tz = settings.timezone || "UTC";

      const desired: DesiredRoutine[] = [
        {
          key: `${MANAGED_PREFIX}morning`,
          name: "Morning brief",
          enabled: settings.morningEnabled,
          trigger: {
            type: "schedule",
            tzid: tz,
            tzMode: "floating",
            localTime: TIME_RE.test(settings.morningTime) ? settings.morningTime : "08:00",
            rrule: "FREQ=DAILY",
          },
          actionName: "briefing_run_brief",
          args: { kind: "morning" },
        },
        {
          key: `${MANAGED_PREFIX}evening`,
          name: "Evening brief",
          enabled: settings.eveningEnabled,
          trigger: {
            type: "schedule",
            tzid: tz,
            tzMode: "floating",
            localTime: TIME_RE.test(settings.eveningTime) ? settings.eveningTime : "23:00",
            rrule: "FREQ=DAILY",
          },
          actionName: "briefing_run_brief",
          args: { kind: "evening" },
        },
        ...scouts.map((s) => ({
          key: `${MANAGED_PREFIX}scout-${s.id}`,
          name: s.title.trim() || `Scout ${s.id.slice(0, 8)}`,
          enabled: s.enabled,
          trigger: intervalToTrigger(s.intervalMinutes, tz),
          actionName: "briefing_run_scout",
          args: { scoutId: s.id },
        })),
      ];

      // Drop every routine we manage (identified by our `key` prefix), then
      // recreate the enabled ones. A delete that is refused (in-flight run) is
      // recorded by key so we don't try to recreate it — create_routine would
      // reject the still-present key, and we'd rather keep the live one.
      const existing = (await appContext.listRoutines()) as Array<{
        id: string;
        key?: string;
      }>;
      const managed = existing.filter((r) => r.key?.startsWith(MANAGED_PREFIX));
      const busy = new Set<string>();
      for (const r of managed) {
        const res = unwrap(await appContext.runAction("delete_routine", { routineId: r.id }));
        if (!res.ok) {
          busy.add(r.key as string);
          log.warn("could not delete routine", { key: r.key, error: res.error });
        }
      }

      const report: Record<string, string> = {};
      for (const d of desired) {
        if (!d.enabled) {
          report[d.key] = "off";
          continue;
        }
        if (busy.has(d.key)) {
          report[d.key] = "busy — kept existing";
          continue;
        }
        const res = unwrap(
          await appContext.runAction("create_routine", {
            key: d.key,
            name: d.name,
            trigger: d.trigger,
            actionName: d.actionName,
            args: d.args,
          }),
        );
        report[d.key] = res.ok
          ? `scheduled (${d.trigger.rrule} @ ${d.trigger.localTime} ${d.trigger.tzid})`
          : `failed: ${res.error}`;
      }

      log.info("routines synced", { report });
      return { status: "ok", data: { routines: report } };
    },
  };
}

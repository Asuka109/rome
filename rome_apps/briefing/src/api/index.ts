import type { RomeAppApiHandler, RomeAppApiRequest, RomeAppContext } from "@rome-os/app-runtime";
import { createScoutsRepository } from "../db/repositories/scouts.js";
import { createScoutResultsRepository } from "../db/repositories/scout-results.js";
import { createBriefsRepository } from "../db/repositories/briefs.js";
import {
  createSettingsRepository,
  DEFAULT_SETTINGS,
  type BriefingSettings,
} from "../db/repositories/settings.js";
import { normalizeIntervalMinutes, INTERVAL_OPTIONS } from "../lib/interval.js";
import { isSupportedChannel, SUPPORTED_CHANNELS } from "../lib/channels.js";

function json(data: unknown, init?: ResponseInit): Response {
  return Response.json(data, init);
}

function readJsonBody(request: RomeAppApiRequest): unknown {
  if (!request.body || request.body.byteLength === 0) return null;
  try {
    return JSON.parse(new TextDecoder().decode(request.body));
  } catch {
    return undefined;
  }
}

const TIME_RE = /^\d{2}:\d{2}$/;

class BriefingApiHandler implements RomeAppApiHandler {
  constructor(private readonly ctx: RomeAppContext) {}

  async handle(request: RomeAppApiRequest): Promise<Response> {
    const route = request.path.join("/");
    const method = request.method;

    if (method === "GET" && request.path.length === 0) {
      return json({ appId: this.ctx.app.id, version: this.ctx.app.version, status: "ok" });
    }

    // GET /state — everything the UI needs in one read.
    if (method === "GET" && route === "state") {
      const scoutsRepo = createScoutsRepository(this.ctx.db);
      const resultsRepo = createScoutResultsRepository(this.ctx.db);
      const briefsRepo = createBriefsRepository(this.ctx.db);
      const settings = await createSettingsRepository(this.ctx.db).get();
      const scouts = await scoutsRepo.list();
      const withResults = await Promise.all(
        scouts.map(async (s) => {
          const recent = await resultsRepo.listForScout(s.id, 1);
          return { ...s, latestResult: recent[0] ?? null };
        }),
      );
      const briefs = await briefsRepo.listRecent(20);
      return json({
        scouts: withResults,
        briefs,
        settings,
        meta: {
          intervalOptions: INTERVAL_OPTIONS,
          channels: SUPPORTED_CHANNELS,
        },
      });
    }

    // POST /scouts — create a scouting task.
    if (method === "POST" && route === "scouts") {
      const payload = readJsonBody(request);
      if (payload === undefined) return json({ error: "invalid_json" }, { status: 400 });
      const body = (payload ?? {}) as Record<string, unknown>;
      const result = await this.ctx.runAction("briefing_add_scout", {
        title: body.title,
        prompt: body.prompt,
        intervalMinutes: body.intervalMinutes,
        enabled: body.enabled,
      });
      if (result.status !== "ok") {
        return json(
          { error: result.status === "error" ? result.error : "failed" },
          { status: 400 },
        );
      }
      return json(result.data, { status: 201 });
    }

    // PUT /scouts/:id — update a scouting task.
    if (method === "PUT" && request.path[0] === "scouts" && request.path.length === 2) {
      const id = request.path[1];
      const payload = readJsonBody(request);
      if (payload === undefined || payload === null) {
        return json({ error: "invalid_json" }, { status: 400 });
      }
      const body = payload as Record<string, unknown>;
      const repo = createScoutsRepository(this.ctx.db);
      const patch: Record<string, unknown> = {};
      if (typeof body.title === "string" && body.title.trim())
        patch.title = body.title.trim().slice(0, 120);
      if (typeof body.prompt === "string" && body.prompt.trim()) patch.prompt = body.prompt.trim();
      if (body.intervalMinutes !== undefined)
        patch.intervalMinutes = normalizeIntervalMinutes(body.intervalMinutes);
      if (typeof body.enabled === "boolean") patch.enabled = body.enabled;
      const updated = await repo.update(id, patch);
      if (!updated) return json({ error: "not_found" }, { status: 404 });
      await this.ctx.runAction("briefing_sync_routines", {});
      return json({ scout: updated });
    }

    // DELETE /scouts/:id
    if (method === "DELETE" && request.path[0] === "scouts" && request.path.length === 2) {
      const repo = createScoutsRepository(this.ctx.db);
      const removed = await repo.remove(request.path[1]);
      if (!removed) return json({ error: "not_found" }, { status: 404 });
      await this.ctx.runAction("briefing_sync_routines", {});
      return json({ removed: true });
    }

    // POST /scouts/:id/run — run a scout now.
    if (
      method === "POST" &&
      request.path[0] === "scouts" &&
      request.path[2] === "run" &&
      request.path.length === 3
    ) {
      const result = await this.ctx.runAction("briefing_run_scout", {
        scoutId: request.path[1],
        trigger: "manual",
      });
      if (result.status !== "ok") {
        return json(
          { error: result.status === "error" ? result.error : "failed" },
          { status: 400 },
        );
      }
      return json(result.data);
    }

    // GET /scouts/:id/results — run history for a scout.
    if (
      method === "GET" &&
      request.path[0] === "scouts" &&
      request.path[2] === "results" &&
      request.path.length === 3
    ) {
      const repo = createScoutResultsRepository(this.ctx.db);
      const results = await repo.listForScout(request.path[1], 60);
      return json({ results });
    }

    // GET /settings
    if (method === "GET" && route === "settings") {
      const settings = await createSettingsRepository(this.ctx.db).get();
      return json({ settings });
    }

    // PUT /settings — save + reconcile brief routines.
    if (method === "PUT" && route === "settings") {
      const payload = readJsonBody(request);
      if (payload === undefined || payload === null) {
        return json({ error: "invalid_json" }, { status: 400 });
      }
      const body = payload as Partial<BriefingSettings>;
      if (typeof body.channel === "string" && !isSupportedChannel(body.channel)) {
        return json(
          {
            error: `Unsupported channel "${body.channel}". Supported: ${SUPPORTED_CHANNELS.join(", ")}.`,
          },
          { status: 400 },
        );
      }
      const repo = createSettingsRepository(this.ctx.db);
      const current = await repo.get();
      const next: BriefingSettings = {
        ...current,
        channel: isSupportedChannel(body.channel) ? body.channel : current.channel,
        whatsappThreadId:
          typeof body.whatsappThreadId === "string"
            ? body.whatsappThreadId.trim()
            : current.whatsappThreadId,
        emailTo:
          typeof body.emailTo === "string" && body.emailTo.trim()
            ? body.emailTo.trim()
            : current.emailTo,
        timezone:
          typeof body.timezone === "string" && body.timezone.trim()
            ? body.timezone.trim()
            : current.timezone,
        morningEnabled:
          typeof body.morningEnabled === "boolean" ? body.morningEnabled : current.morningEnabled,
        morningTime:
          typeof body.morningTime === "string" && TIME_RE.test(body.morningTime)
            ? body.morningTime
            : current.morningTime,
        eveningEnabled:
          typeof body.eveningEnabled === "boolean" ? body.eveningEnabled : current.eveningEnabled,
        eveningTime:
          typeof body.eveningTime === "string" && TIME_RE.test(body.eveningTime)
            ? body.eveningTime
            : current.eveningTime,
      };
      await repo.save(next);
      const sync = await this.ctx.runAction("briefing_sync_routines", {});
      return json({
        settings: next,
        routines:
          sync.status === "ok" ? (sync.data as { routines?: unknown })?.routines : undefined,
        routineSyncError: sync.status === "error" ? sync.error : undefined,
      });
    }

    // POST /briefs/run { kind, deliver } — run a brief now (test).
    if (method === "POST" && route === "briefs/run") {
      const payload = readJsonBody(request);
      if (payload === undefined) return json({ error: "invalid_json" }, { status: 400 });
      const body = (payload ?? {}) as { kind?: string; deliver?: boolean };
      const result = await this.ctx.runAction("briefing_run_brief", {
        kind: body.kind ?? "test",
        deliver: body.deliver !== false,
      });
      if (result.status !== "ok") {
        return json(
          { error: result.status === "error" ? result.error : "failed" },
          { status: 500 },
        );
      }
      return json(result.data);
    }

    // GET /briefs — recent brief runs.
    if (method === "GET" && route === "briefs") {
      const repo = createBriefsRepository(this.ctx.db);
      return json({ briefs: await repo.listRecent(20) });
    }

    return json(
      {
        error: "not_found",
        message: `Unknown Briefing API route: /${route}`,
        defaults: DEFAULT_SETTINGS,
      },
      { status: 404 },
    );
  }
}

export function createApiHandler(ctx: RomeAppContext): RomeAppApiHandler {
  return new BriefingApiHandler(ctx);
}

import {
  type RomeAppApiHandler,
  type RomeAppApiRequest,
  type RomeAppContext,
} from "@rome-os/app-runtime";
import { createRunsRepository } from "../db/repositories/runs.js";

function readJsonBody(request: RomeAppApiRequest): unknown {
  if (!request.body || request.body.byteLength === 0) return null;
  const text = new TextDecoder().decode(request.body);
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

// The app's HTTP surface: a synchronous trigger for the web page (`POST /run`)
// and the run-history feed it renders (`GET /runs`). Live per-node progress and
// the structure diagram are a separate, deferred surface.
class WorkflowApiHandler implements RomeAppApiHandler {
  constructor(private readonly ctx: RomeAppContext) {}

  async handle(request: RomeAppApiRequest): Promise<Response> {
    const route = request.path.join("/");

    if (request.method === "GET" && request.path.length === 0) {
      return Response.json({ appId: this.ctx.app.id, version: this.ctx.app.version, status: "ok" });
    }

    // GET /runs?limit=N — recent runs, newest first, for the run-history list.
    if (request.method === "GET" && route === "runs") {
      const raw = request.query.get("limit");
      const parsed = raw && raw.trim() !== "" ? Number(raw) : NaN;
      const limit = Number.isFinite(parsed) ? Math.min(Math.max(parsed, 1), 100) : 20;
      const runs = createRunsRepository(this.ctx.db).recent(limit);
      return Response.json({ runs });
    }

    // POST /run { input?, dryRun? } — run the workflow and return its result.
    if (request.method === "POST" && route === "run") {
      const payload = readJsonBody(request);
      if (payload === undefined) return Response.json({ error: "invalid_json" }, { status: 400 });
      // Fail closed on a malformed envelope: the body must be a JSON object (or
      // empty). A non-object (array/string/number/boolean) would otherwise fall
      // through to a LIVE run — firing real external writes for a caller that
      // never sent a usable `input`/`dryRun`.
      if (payload !== null && (typeof payload !== "object" || Array.isArray(payload))) {
        return Response.json({ error: "request body must be a JSON object" }, { status: 400 });
      }
      const body = payload as { input?: unknown; dryRun?: unknown } | null;
      const dryRun = body?.dryRun;
      if (dryRun !== undefined && typeof dryRun !== "boolean") {
        return Response.json({ error: "dryRun must be a boolean" }, { status: 400 });
      }
      const res = await this.ctx.runAction("morning-brief:run", {
        input: body?.input,
        dryRun,
      });
      if (res.status !== "ok") {
        const error = res.status === "error" ? res.error : `run returned ${res.status}`;
        return Response.json({ error }, { status: 500 });
      }
      return Response.json({ result: res.data });
    }

    return Response.json(
      { error: "not_found", message: `Unknown route: /${route}` },
      { status: 404 },
    );
  }
}

export function createApiHandler(ctx: RomeAppContext): RomeAppApiHandler {
  return new WorkflowApiHandler(ctx);
}

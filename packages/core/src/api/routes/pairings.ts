import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { guardianAuth } from "../../db/schema.js";
import { resolveGuardianSession } from "../../lib/guardian-session.js";
import type { ApiDeps } from "../deps.js";

type PairingDeps = Pick<ApiDeps, "db" | "pairingRepo" | "pairingMethods">;

export function pairingsRoutes(deps: PairingDeps): Hono {
  const app = new Hono();

  app.use("/pairings/*", async (c, next) => {
    const session = await resolveGuardianSession(c, deps.db);
    if (!session) return c.json({ error: "Guardian authentication required" }, 401);
    const guardian = deps.db
      .select({ userId: guardianAuth.userId })
      .from(guardianAuth)
      .where(eq(guardianAuth.userId, session.userId))
      .get();
    if (!guardian) return c.json({ error: "Guardian authentication required" }, 403);
    await next();
  });

  app.get("/pairings", (c) =>
    c.json(deps.pairingRepo.listPending().map((request) => pairingDto(deps, request))),
  );

  app.post("/pairings/:id/:decision", async (c) => {
    const decision = c.req.param("decision");
    if (decision !== "approve" && decision !== "reject") {
      return c.json({ error: "Decision must be approve or reject" }, 400);
    }
    const body: { token?: unknown } = await c.req.json<{ token?: unknown }>().catch(() => ({}));
    if (body.token !== undefined && typeof body.token !== "string") {
      return c.json({ error: "token must be a string" }, 400);
    }
    const result = deps.pairingRepo.resolve(
      c.req.param("id"),
      decision,
      typeof body.token === "string" ? body.token : null,
    );
    if (result.ok) return c.json(result);
    const status =
      result.reason === "not_found"
        ? 404
        : result.reason === "invalid_token"
          ? 403
          : result.reason === "expired"
            ? 410
            : 409;
    return c.json(result, status);
  });

  return app;
}

export function pairingDto(
  deps: Pick<PairingDeps, "pairingMethods">,
  request: {
    id: string;
    channel: string;
    channelUserId: string;
    displayName: string | null;
    token: string;
    status: string;
    createdAt: Date;
    expiresAt: Date;
  },
) {
  const base = deps.pairingMethods.cliOrigin;
  return {
    id: request.id,
    channel: request.channel,
    channelUserId: request.channelUserId,
    displayName: request.displayName,
    status: request.status,
    createdAt: request.createdAt.toISOString(),
    expiresAt: request.expiresAt.toISOString(),
    pairingUrl: deps.pairingMethods.instanceOrigin
      ? `${deps.pairingMethods.instanceOrigin}/pairing/${request.id}#token=${request.token}`
      : null,
    cli: base
      ? {
          approve: `curl -fsS -X POST ${base}/_internal/pairings/${request.id}/approve`,
          reject: `curl -fsS -X POST ${base}/_internal/pairings/${request.id}/reject`,
        }
      : null,
  };
}

import { Hono } from "hono";
import { desc, eq } from "drizzle-orm";
import { webhookInvocations } from "../../db/schema.js";
import type { ApiDeps } from "../deps.js";

export function webhookInvocationsRoutes(deps: ApiDeps): Hono {
  const app = new Hono();

  app.get("/webhook-invocations", async (c) => {
    const actionName = c.req.query("actionName");
    const limit = Math.min(parseInt(c.req.query("limit") ?? "50", 10), 200);
    const offset = parseInt(c.req.query("offset") ?? "0", 10);

    const rows = actionName
      ? await deps.db
          .select()
          .from(webhookInvocations)
          .where(eq(webhookInvocations.actionName, actionName))
          .orderBy(desc(webhookInvocations.createdAt))
          .limit(limit)
          .offset(offset)
      : await deps.db
          .select()
          .from(webhookInvocations)
          .orderBy(desc(webhookInvocations.createdAt))
          .limit(limit)
          .offset(offset);

    return c.json(rows);
  });

  return app;
}

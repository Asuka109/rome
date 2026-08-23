import { Hono } from "hono";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { actionExecutions } from "../../db/schema.js";
import type { ApiDeps } from "../deps.js";

export function actionExecutionsRoutes(deps: ApiDeps): Hono {
  const app = new Hono();

  app.get("/action-executions", async (c) => {
    const actionName = c.req.query("actionName");
    const limit = Math.min(parseInt(c.req.query("limit") ?? "50", 10), 200);
    const offset = parseInt(c.req.query("offset") ?? "0", 10);

    const rootFilter = and(
      sql`${actionExecutions.id} = ${actionExecutions.rootExecutionId}`,
      actionName ? eq(actionExecutions.actionName, actionName) : undefined,
    );

    const roots = await deps.db
      .select()
      .from(actionExecutions)
      .where(rootFilter)
      .orderBy(desc(actionExecutions.createdAt))
      .limit(limit)
      .offset(offset);

    const rootIds = roots.map((row) => row.rootExecutionId);
    const rows =
      rootIds.length === 0
        ? []
        : await deps.db
            .select()
            .from(actionExecutions)
            .where(inArray(actionExecutions.rootExecutionId, rootIds))
            .orderBy(desc(actionExecutions.createdAt));

    const groups = roots.map((root) => {
      const children = rows
        .filter((row) => row.rootExecutionId === root.rootExecutionId && row.id !== root.id)
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      return {
        rootExecution: root,
        children,
      };
    });

    return c.json(groups);
  });

  app.post("/action-executions/:id/cancel", async (c) => {
    const rootExecutionId = c.req.param("id");
    const cancelled = await deps.actionEngine.cancel(rootExecutionId);
    if (!cancelled) {
      return c.json({ error: "Execution not running" }, 404);
    }
    return c.json({ ok: true, rootExecutionId }, 202);
  });

  return app;
}

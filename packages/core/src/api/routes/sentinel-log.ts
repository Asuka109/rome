import { Hono } from "hono";
import { desc, eq } from "drizzle-orm";
import { sentinelLog } from "../../db/schema.js";
import type { ApiDeps } from "../deps.js";

export function sentinelLogRoutes(deps: ApiDeps): Hono {
  const app = new Hono();

  app.get("/sentinel-log", async (c) => {
    const reviewed = c.req.query("reviewed");
    if (reviewed === "false") {
      const rows = await deps.db
        .select()
        .from(sentinelLog)
        .where(eq(sentinelLog.reviewed, false))
        .orderBy(desc(sentinelLog.createdAt));
      return c.json(rows);
    }
    const rows = await deps.db.select().from(sentinelLog).orderBy(desc(sentinelLog.createdAt));
    return c.json(rows);
  });

  app.post("/sentinel-log/:id/review", async (c) => {
    const id = c.req.param("id");
    const result = await deps.db
      .update(sentinelLog)
      .set({ reviewed: true })
      .where(eq(sentinelLog.id, id));
    if (Number(result.changes ?? 0) === 0) {
      return c.json({ error: "Log entry not found" }, 404);
    }
    return c.json({ ok: true });
  });

  return app;
}

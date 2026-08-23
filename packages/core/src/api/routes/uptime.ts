import { Hono } from "hono";

export function uptimeRoutes(): Hono {
  const app = new Hono();
  app.get("/uptime", (c) => c.json({ uptime: process.uptime() }));
  return app;
}

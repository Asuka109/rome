import { Hono } from "hono";

export function terminalRoutes(): Hono {
  const app = new Hono();

  app.get("/terminal/config", (c) => {
    // The terminal WebSocket is attached to the same Hono server,
    // so we always route through the same origin.
    const url = new URL(c.req.url);
    const wsProto = url.protocol === "https:" ? "wss" : "ws";
    return c.json({ wsUrl: `${wsProto}://${url.host}` });
  });

  return app;
}

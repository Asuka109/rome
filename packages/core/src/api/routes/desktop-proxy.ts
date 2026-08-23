import { Hono } from "hono";
import { proxyDesktopHttp } from "../../desktop-proxy-server.js";

export function desktopProxyRoutes(): Hono {
  const app = new Hono();
  app.all("/desktop-proxy", (c) => proxyDesktopHttp(c.req.raw));
  app.all("/desktop-proxy/*", (c) => proxyDesktopHttp(c.req.raw));
  return app;
}

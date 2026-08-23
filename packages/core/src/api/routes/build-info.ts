import { Hono } from "hono";
import { getBuildInfo } from "../../build-info.js";
import type { ApiDeps } from "../deps.js";

export function buildInfoRoutes(deps: Pick<ApiDeps, "bootVersionReport">): Hono {
  const app = new Hono();
  app.get("/build-info", (c) => c.json({ ...getBuildInfo(), ...deps.bootVersionReport }));
  return app;
}

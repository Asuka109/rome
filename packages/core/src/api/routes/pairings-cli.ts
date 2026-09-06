import { Hono } from "hono";
import type { ApiDeps } from "../deps.js";
import { isLoopbackInternalApiHost } from "./discord-cli.js";
import { pairingDto } from "./pairings.js";

type PairingCliDeps = Pick<ApiDeps, "pairingRepo" | "pairingMethods">;

export function pairingsCliRoutes(deps: PairingCliDeps, internalApiHost: string): Hono {
  if (!isLoopbackInternalApiHost(internalApiHost)) {
    throw new Error("Pairing CLI requires the internal API server to bind to a loopback address");
  }
  const app = new Hono();
  app.get("/_internal/pairings", (c) =>
    c.json(deps.pairingRepo.listPending().map((request) => pairingDto(deps, request))),
  );
  app.post("/_internal/pairings/:id/:decision", (c) => {
    const decision = c.req.param("decision");
    if (decision !== "approve" && decision !== "reject") {
      return c.json({ error: "Decision must be approve or reject" }, 400);
    }
    const result = deps.pairingRepo.resolve(c.req.param("id"), decision, null);
    if (result.ok) return c.json(result);
    return c.json(result, result.reason === "not_found" ? 404 : 409);
  });
  return app;
}

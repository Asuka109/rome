import type { ErrorHandler } from "hono";
import { HTTPException } from "hono/http-exception";
import { createLogger } from "../../logger.js";

const log = createLogger("api");

export const errorHandler: ErrorHandler = (err, c) => {
  if (err instanceof HTTPException) {
    return err.getResponse();
  }

  log.error("unhandled api error", {
    path: c.req.path,
    method: c.req.method,
    error: err instanceof Error ? err.message : String(err),
    stack: err instanceof Error ? err.stack : undefined,
  });

  return c.json({ error: err instanceof Error ? err.message : "Internal error" }, 500);
};

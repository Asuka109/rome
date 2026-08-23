import { createMiddleware } from "hono/factory";

export function createWebhookAuth(webhookApiKey: string | undefined) {
  const key = webhookApiKey?.trim() ?? "";

  return createMiddleware(async (c, next) => {
    if (!key) {
      return c.json({ error: "Webhook API key is not configured" }, 503);
    }
    const provided = c.req.header("x-api-key") ?? "";
    if (!provided || provided !== key) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    await next();
  });
}

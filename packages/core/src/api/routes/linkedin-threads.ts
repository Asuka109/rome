import { Hono } from "hono";
import {
  OpencliAuthError,
  safeSendLinkedInReply,
  type LinkedInSafeSendInput,
  type LinkedInSafeSendResult,
} from "../../channels/linkedin-cli.js";
import type { ApiDeps } from "../deps.js";

/**
 * Views over the LinkedIn inbox mirror and the guarded reply endpoint backing
 * the People tab's "LinkedIn messages" section. The mirror is fed by the
 * LinkedIn connection's poller (channels/linkedin.ts). Replies go through
 * opencli `linkedin safe-send`. It verifies the visible thread and recipient
 * before sending.
 */
export interface LinkedInThreadsSeams {
  sendReply?: (input: LinkedInSafeSendInput) => Promise<LinkedInSafeSendResult>;
}

export function linkedinThreadsRoutes(deps: ApiDeps, seams: LinkedInThreadsSeams = {}): Hono {
  const app = new Hono();
  const sendReply = seams.sendReply ?? safeSendLinkedInReply;

  app.get("/linkedin/threads", async (c) => {
    const rows = await deps.linkedInStoreRepo.listThreads();
    return c.json(rows);
  });

  app.get("/linkedin/threads/:threadId/messages", async (c) => {
    const threadId = c.req.param("threadId");
    const limit = parsePositiveInt(c.req.query("limit"));
    const before = parsePositiveInt(c.req.query("before"));
    const messages = await deps.linkedInStoreRepo.getMessages(threadId, { limit, before });
    return c.json(messages);
  });

  app.post("/linkedin/threads/:threadId/send", async (c) => {
    const threadId = c.req.param("threadId");
    const body = await c.req.json<{ text?: unknown }>().catch(() => ({}) as { text?: unknown });
    const text = typeof body.text === "string" ? body.text.trim() : "";
    if (!text) return c.json({ error: "text is required" }, 400);

    // Resolve the safety-critical URL/name from the server-owned mirror rather
    // than trusting the browser to choose where the write lands.
    const thread = (await deps.linkedInStoreRepo.listThreads()).find(
      (candidate) => candidate.threadId === threadId,
    );
    if (!thread) return c.json({ error: "LinkedIn thread not found" }, 404);

    const expectedName = thread.personName || thread.conversationName;
    if (!expectedName) {
      return c.json({ error: "LinkedIn recipient is not available yet" }, 409);
    }

    try {
      const result = await sendReply({
        threadUrl: thread.threadUrl,
        expectedName,
        message: text,
      });
      return c.json({ ok: true, recipient: result.recipient });
    } catch (err) {
      if (err instanceof OpencliAuthError) {
        return c.json({ error: "LinkedIn is not connected" }, 503);
      }
      return c.json({ error: err instanceof Error ? err.message : String(err) }, 502);
    }
  });

  return app;
}

function parsePositiveInt(raw: string | undefined): number | undefined {
  if (raw == null) return undefined;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : undefined;
}

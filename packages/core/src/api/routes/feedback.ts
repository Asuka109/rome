import { Hono } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { z } from "zod";
import { assembleDiagnosticBundle, type DiagnosticsDeps } from "../../lib/diagnostics.js";
import { getInstanceToken } from "../../lib/instance-identity.js";
import { getRomeCloudOrigin } from "../../lib/rome-cloud-origin.js";
import {
  FEEDBACK_BODY_MAX,
  FEEDBACK_SCHEMA_VERSION,
  type FeedbackReport,
} from "../../lib/feedback.js";

// Guardian-facing "share feedback" relay. The dashboard POSTs free text plus the
// context it owns (`client`); the instance attaches the diagnostics it measures
// and forwards a versioned report to Rome Cloud over the instance token,
// where it lands as a triage row. Like the system-upgrade forwarders, the route
// holds no policy of its own — `/api/*` is already guardian-gated at the edge —
// it just enriches and relays.
//
// The trust boundary lives here: `diagnostics` is assembled server-side and is
// never read from the request body, so a malicious or buggy client can't spoof
// the trusted namespace (the worst it can do is stuff keys under `client`).

const RELAY_TIMEOUT_MS = 15_000;

const bodySchema = z
  .object({
    body: z.string().trim().min(1).max(FEEDBACK_BODY_MAX),
    // Open-ended by design (route, theme, UA, …). `.record` accepts any keys, so
    // the client namespace can grow without a contract change.
    client: z.record(z.string(), z.unknown()).default({}),
  })
  // Strict on the envelope (the part both sides control): a stray top-level key
  // — e.g. a `diagnostics` spoof attempt — is rejected outright.
  .strict();

function romeCloudAccess(): { origin: string; token: string } | null {
  const token = getInstanceToken();
  const origin = getRomeCloudOrigin();
  if (!token || !origin) return null;
  return { origin, token };
}

export function feedbackRoutes(deps: DiagnosticsDeps): Hono {
  const app = new Hono();

  app.post("/feedback", async (c) => {
    const raw = await c.req.json().catch(() => null);
    const parsed = bodySchema.safeParse(raw);
    if (!parsed.success) {
      return c.json({ error: "invalid_request", details: parsed.error.flatten() }, 400);
    }

    const diagnostics = await assembleDiagnosticBundle(deps);
    const report: FeedbackReport = {
      schemaVersion: FEEDBACK_SCHEMA_VERSION,
      body: parsed.data.body,
      payload: { client: parsed.data.client, diagnostics },
    };

    const romeCloud = romeCloudAccess();
    if (!romeCloud) return c.json({ error: "pantheon_unconfigured" }, 503);

    let response: Response;
    try {
      response = await fetch(new URL("/api/instance/feedback", romeCloud.origin), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${romeCloud.token}`,
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        },
        cache: "no-store",
        body: JSON.stringify(report),
        signal: AbortSignal.timeout(RELAY_TIMEOUT_MS),
      });
    } catch {
      return c.json({ error: "pantheon_unreachable" }, 502);
    }

    if (!response.ok) {
      // Mirror the upstream status so the dashboard can tell a rejected report
      // (e.g. 413 too large) from an unreachable Rome Cloud.
      const body = await response.json().catch(() => ({ error: "relay_failed" }));
      return c.json(body, response.status as ContentfulStatusCode);
    }

    return c.json({ ok: true }, 201);
  });

  return app;
}

import type { DiagnosticBundle } from "./diagnostics.js";

// Shared shape + limits for the "share feedback" feature.
//
// The web client sends `{ body, client }`; the instance enriches it with
// server-assembled diagnostics and relays `{ schemaVersion, body, payload }` to
// Rome Cloud. The two payload namespaces preserve provenance and the trust
// boundary: `client` is browser-supplied (untrusted, open-ended), `diagnostics`
// is measured by the instance and must NEVER be populated from the request body
// — that is what makes spoofing the trusted namespace structurally impossible.
//
// `schemaVersion` is bumped only on a breaking reshape; additive fields under
// either namespace need no bump (Rome Cloud stores the payload opaquely).

export const FEEDBACK_SCHEMA_VERSION = 1;

// Caps so a single report can't bloat the relay or the Rome Cloud row. Mirrored
// (more loosely) on the Rome Cloud edge, which can't trust instance-side checks.
export const FEEDBACK_BODY_MAX = 4_000;

export interface FeedbackReport {
  schemaVersion: number;
  body: string;
  payload: {
    /** Browser-supplied context (route, theme, UA, viewport, …). Untrusted. */
    client: Record<string, unknown>;
    /** Instance-measured diagnostics. Server-owned; never from the request. */
    diagnostics: DiagnosticBundle;
  };
}

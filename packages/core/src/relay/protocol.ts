// Wire protocol between the Cloudflare webhook relay and this drainer client.
// Mirrors the Rome Cloud relay protocol — the relay is the source of truth;
// keep these shapes in sync with it:
// https://github.com/amantru/rome-cloud/blob/main/webhook-relay/src/protocol.ts

/** Frames the relay sends to a connected drainer. */
export type ServerFrame =
  | { type: "ready"; backlog: number }
  | {
      type: "event";
      /** Monotonic per-mailbox sequence; never reused, used for dedupe + ack. */
      seq: number;
      receivedAt: number;
      method: string;
      /** Path + query as received at the relay deposit endpoint. */
      path: string;
      headers: Record<string, string>;
      /** Raw request body, base64-encoded. `null` for empty bodies. */
      body: string | null;
    };

// Keepalive is protocol-level (`ws.ping()`, answered at the Cloudflare edge
// without waking the mailbox DO) — deliberately NOT an application frame.

/** Frames the drainer sends to the relay. */
export type ClientFrame = { type: "ack"; seq: number };

/**
 * Header the drainer stamps on every event it replays into a local app handler.
 * It marks "this webhook was buffered by the relay and delivered late", so a
 * handler may relax a freshness / replay-window check for drained events while
 * still verifying the payload signature.
 *
 * Security: the public app-api edge strips all `x-rome-internal-*` headers, so
 * only in-process callers (this drainer) can set it — an external caller hitting
 * the public `/webhook` route cannot forge it.
 */
export const RELAY_DRAINED_HEADER = "x-rome-internal-relay-drained";

/**
 * Prefix reserved for in-process callers. Two boundaries enforce it: the public
 * app-api edge strips it off inbound public requests, and the drainer strips it
 * off the depositor-supplied frame headers before replaying — the depositor is
 * an external webhook sender, just as untrusted as the public edge. Both strip
 * sites must use this same constant so they can never drift apart.
 */
export const RELAY_INTERNAL_HEADER_PREFIX = "x-rome-internal-";

/** Delete every reserved-prefix header from an untrusted header bag, in place. */
export function stripInternalHeaders(headers: Record<string, string>): void {
  for (const key of Object.keys(headers)) {
    if (key.toLowerCase().startsWith(RELAY_INTERNAL_HEADER_PREFIX)) delete headers[key];
  }
}

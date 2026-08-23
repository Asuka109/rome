export interface SubscriptionEvent {
  eventId: string;
  provider: string;
  eventType: string;
  receivedAt: string;
  data: Record<string, unknown>;
}

interface V3WireShape {
  id?: unknown;
  type?: unknown;
  data?: unknown;
  metadata?: {
    trigger_slug?: unknown;
  };
}

function readStr(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

/**
 * Read `metadata.trigger_slug` (V3) from a verified webhook body. Returns
 * `null` for non-trigger event types (e.g. `composio.connected_account.expired`)
 * or any payload framing without it — the webhook handler treats that branch
 * as "nothing to emit, ack and move on".
 */
export function extractTriggerSlug(raw: unknown): string | null {
  const shape = (raw ?? {}) as V3WireShape;
  return readStr(shape.metadata?.trigger_slug) ?? null;
}

/**
 * Read the V3 payload's `type` discriminant. We only emit on
 * `composio.trigger.message`; lifecycle events like `composio.trigger.disabled`
 * also carry `metadata.trigger_slug` but are not real trigger fires.
 */
export function extractEventType(raw: unknown): string | null {
  const shape = (raw ?? {}) as V3WireShape;
  return readStr(shape.type) ?? null;
}

/**
 * Build the `SubscriptionEvent` that gets persisted. `provider` and
 * `eventType` are passed in (derived from `trigger_slug` upstream of this
 * function), so the webhook body cannot shift the topic on its own. The
 * body contributes the dedup id and the data payload.
 */
export function normalizeComposioPayload(
  raw: unknown,
  classification: { provider: string; eventType: string },
  webhookId: string,
  receivedAtIso: string,
): SubscriptionEvent {
  const shape = (raw ?? {}) as V3WireShape;
  const eventId = readStr(shape.id) ?? webhookId;
  const data =
    shape.data && typeof shape.data === "object" && !Array.isArray(shape.data)
      ? (shape.data as Record<string, unknown>)
      : {};
  return {
    eventId,
    provider: classification.provider,
    eventType: classification.eventType,
    receivedAt: receivedAtIso,
    data,
  };
}

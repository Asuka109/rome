import { EventsRepo } from "./events-repo.js";
import { normalizeGithubPayload } from "./github-webhook.js";
import {
  extractEventType,
  extractTriggerSlug,
  normalizeComposioPayload,
  type SubscriptionEvent,
} from "./normalize.js";
import { buildTopic } from "./topic.js";

const TRIGGER_MESSAGE_TYPE = "composio.trigger.message";

export type ProcessResult =
  | {
      kind: "ignored";
      reason: "not_a_trigger_message" | "missing_trigger_slug" | "unknown_trigger_slug";
    }
  | { kind: "emitted"; event: SubscriptionEvent; topic: string }
  | { kind: "deduped"; event: SubscriptionEvent; topic: string };

/** The system `publish_event` action — the producer surface that drops an
 * event onto Rome's central in-memory bus. Routines with a matching
 * `event-bus` trigger fire from there. */
const PUBLISH_EVENT_ACTION = "publish_event";

/** Bus-event `source`, matched against a routine's optional `sourcePattern`. */
const EVENT_SOURCE = "connector";

export type RunAction = (name: string, args: Record<string, unknown>) => Promise<unknown>;

/**
 * Forward a freshly-emitted Composio trigger event onto Rome's central event
 * bus (via the system `publish_event` action) so routines with a matching
 * `event-bus` trigger fire.
 *
 * Gated on `kind === "emitted"`: a `deduped` result is a Composio retry of an
 * event we already recorded, and republishing it would fire the routine again
 * for the same PR update on every retry. `ignored` carries no event at all.
 * The bus event's `name` is the same `topic` returned by `POST /feeds`, so a
 * routine's `eventName` is the exact string the feed creator already holds.
 */
export async function publishEmittedEvent(
  runAction: RunAction,
  result: ProcessResult,
): Promise<void> {
  if (result.kind !== "emitted") return;
  await runAction(PUBLISH_EVENT_ACTION, {
    name: result.topic,
    source: EVENT_SOURCE,
    payload: result.event.data,
  });
}

/**
 * Resolves a trigger slug to its owning toolkit slug. Returns `null` when
 * Composio doesn't recognize the slug (treated as ignored). Transient errors
 * (network, 5xx) should throw — the webhook handler will surface a non-2xx
 * response so Composio retries.
 */
export type ResolveToolkitSlug = (triggerSlug: string) => Promise<string | null>;

/**
 * Runs AFTER HMAC verification. Composio is the source of truth for
 * subscription state, so this routine does not consult any local feeds
 * table — it derives `(provider, eventType, topic)` from the verified V3
 * payload plus an authoritative toolkit lookup via `resolveToolkit` (typically
 * `ComposioClient.getTriggerType`). We only emit when
 * `type === composio.trigger.message` (lifecycle events like
 * `composio.trigger.disabled` also carry `metadata.trigger_slug` but are not
 * real fires).
 */
export async function processVerifiedWebhook(
  repo: EventsRepo,
  resolveToolkit: ResolveToolkitSlug,
  rawPayload: unknown,
  webhookId: string,
  receivedAt: Date,
): Promise<ProcessResult> {
  if (extractEventType(rawPayload) !== TRIGGER_MESSAGE_TYPE) {
    return { kind: "ignored", reason: "not_a_trigger_message" };
  }
  const triggerSlug = extractTriggerSlug(rawPayload);
  if (!triggerSlug) return { kind: "ignored", reason: "missing_trigger_slug" };

  const toolkit = await resolveToolkit(triggerSlug);
  if (!toolkit) return { kind: "ignored", reason: "unknown_trigger_slug" };

  const provider = toolkit.toLowerCase();
  const eventType = triggerSlug.toLowerCase();
  const topic = buildTopic(provider, eventType);

  const event = normalizeComposioPayload(
    rawPayload,
    { provider, eventType },
    webhookId,
    receivedAt.toISOString(),
  );

  const inserted = await repo.insertEventIfAbsent({
    eventId: event.eventId,
    topic,
    provider,
    eventType,
    receivedAt,
    payloadJson: JSON.stringify(event.data),
  });

  if (inserted) {
    await repo.pruneRingBuffer();
    return { kind: "emitted", event, topic };
  }
  return { kind: "deduped", event, topic };
}

/**
 * Runs AFTER GitHub HMAC verification — the GitHub twin of
 * `processVerifiedWebhook`, with no Composio involvement. The provider is always
 * `github` and the event type comes from the trusted `X-GitHub-Event` header, so
 * there is no trigger-slug → toolkit lookup: the topic is `github.<event>`
 * directly. `deliveryId` is GitHub's `X-GitHub-Delivery` GUID, which dedups
 * retries (GitHub redelivers on a non-2xx) exactly like the Composio webhook id.
 */
export async function processGithubWebhook(
  repo: EventsRepo,
  rawPayload: unknown,
  eventType: string,
  deliveryId: string,
  receivedAt: Date,
): Promise<ProcessResult> {
  const provider = "github";
  const normalizedEventType = eventType.toLowerCase();
  const topic = buildTopic(provider, normalizedEventType);

  const event = normalizeGithubPayload(
    rawPayload,
    normalizedEventType,
    deliveryId,
    receivedAt.toISOString(),
  );

  const inserted = await repo.insertEventIfAbsent({
    eventId: event.eventId,
    topic,
    provider,
    eventType: normalizedEventType,
    receivedAt,
    payloadJson: JSON.stringify(event.data),
  });

  if (inserted) {
    await repo.pruneRingBuffer();
    return { kind: "emitted", event, topic };
  }
  return { kind: "deduped", event, topic };
}

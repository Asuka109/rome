import type {
  ConversationId,
  InboundMessage,
  MessageReceipt,
  OutgoingMessage,
  TalkFeatureMap,
  TalkFeatureName,
  TalkRouter,
} from "@rome-os/app-runtime";
import type { Connection, ConnectionId } from "./types.js";
import type { ConnectionRegistry } from "./registry.js";
import { createLogger } from "../logger.js";

const log = createLogger("talk-router");

export class ConnectionTalkRouter implements TalkRouter {
  private readonly handlers = new Map<
    ConnectionId,
    Set<(message: InboundMessage) => Promise<void>>
  >();

  constructor(private readonly registry: ConnectionRegistry) {
    registry.onUnlocked("talk", (connection) => this.attach(connection));
  }

  async list(): Promise<Array<{ connectionId: string; service: string }>> {
    return this.registry
      .all()
      .filter((connection) => connection.status().talk.state !== "unsupported")
      .map((connection) => ({ connectionId: connection.id, service: connection.service }));
  }

  subscribe(connectionId: string, handler: (message: InboundMessage) => Promise<void>): () => void {
    const handlers = this.handlers.get(connectionId) ?? new Set();
    handlers.add(handler);
    this.handlers.set(connectionId, handlers);
    const talk = this.registry.get(connectionId).talk;
    const detach = talk?.subscribe(handler);
    return () => {
      handlers.delete(handler);
      if (handlers.size === 0) this.handlers.delete(connectionId);
      detach?.();
    };
  }

  async send(
    connectionId: string,
    conversationId: ConversationId,
    message: OutgoingMessage,
  ): Promise<MessageReceipt> {
    const talk = this.requireTalk(connectionId);
    return talk.send(conversationId, message);
  }

  feature<K extends TalkFeatureName>(connectionId: string, name: K): TalkFeatureMap[K] | null {
    const current = this.registry.get(connectionId).talk?.feature(name);
    if (!current) {
      log.debug("talk_feature.unavailable", { connectionId, feature: name });
      return null;
    }
    return new Proxy({} as TalkFeatureMap[K] & object, {
      get: (_target, property) => {
        return (...args: unknown[]) => {
          const feature = this.requireTalk(connectionId).feature(name) as
            | (TalkFeatureMap[K] & Record<PropertyKey, unknown>)
            | null;
          if (!feature) {
            log.warn("talk_feature.unavailable", { connectionId, feature: name });
            throw new Error(`talk feature "${name}" is unavailable`);
          }
          const method = feature[property];
          if (typeof method !== "function") {
            throw new Error(`talk feature "${name}" has no operation "${String(property)}"`);
          }
          return method.apply(feature, args);
        };
      },
    });
  }

  connectionForService(service: string): Connection | null {
    return this.registry.find(service)[0] ?? null;
  }

  private attach(connection: Connection): void {
    const talk = connection.talk;
    if (!talk) return;
    for (const handler of this.handlers.get(connection.id) ?? []) talk.subscribe(handler);
  }

  private requireTalk(connectionId: string) {
    const connection = this.registry.get(connectionId);
    const talk = connection.talk;
    if (!talk) throw new Error(`Talk is unavailable for connection "${connectionId}"`);
    return talk;
  }
}

export function createTalkRouter(registry: ConnectionRegistry): ConnectionTalkRouter {
  return new ConnectionTalkRouter(registry);
}

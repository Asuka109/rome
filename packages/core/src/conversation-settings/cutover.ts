import { and, eq } from "drizzle-orm";
import type {
  ConversationId,
  ConversationSettingsOverrides,
  StoredConversationSettings,
} from "@rome-os/app-runtime";
import type { DrizzleDb } from "../db/index.js";
import { connections, romeSessions, settings as appSettings } from "../db/schema/system.js";
import { channelConversationId } from "../db/repositories/webchat.js";
import { DEFAULT_WEBCHAT_PROJECT_NAME } from "../webchat/constants.js";
import type { ConversationSettingsService } from "./service.js";
import { isCoreMainAgentId } from "../apps/artifact-id.js";

interface LegacyChannelConfig {
  channelName?: string;
  chatName?: string;
  mode?: "allow" | "ignore";
  requireMention?: boolean;
  allowBots?: "none" | "mentions" | "all";
  ignoreNoMention?: boolean;
  autoThread?: boolean;
  agentName?: string;
  updatedAt?: string;
  updatedBy?: string;
}

function legacyOverrides(config: LegacyChannelConfig): ConversationSettingsOverrides {
  const overrides: ConversationSettingsOverrides = {};
  if (config.mode === "ignore") overrides.enabled = false;
  if (config.requireMention === false) (overrides.activation ??= {}).mode = "all";
  if (config.allowBots) {
    (overrides.activation ??= {}).botMessages =
      config.allowBots === "none" ? "ignore" : config.allowBots;
  }
  if (config.ignoreNoMention === false) {
    (overrides.activation ??= {}).whenOthersMentioned = "respond";
  }
  if (config.autoThread === false) (overrides.replies ??= {}).placement = "inline";
  if (config.agentName) (overrides.routing ??= {}).agentName = config.agentName;
  return overrides;
}

function validateLegacyConfig(
  service: "discord" | "feishu",
  conversationId: string,
  value: unknown,
  agents: ReadonlySet<string>,
): LegacyChannelConfig {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`Invalid ${service} settings for conversation "${conversationId}"`);
  }
  const config = value as Record<string, unknown>;
  const optionalString = (key: string) => {
    if (config[key] !== undefined && typeof config[key] !== "string") {
      throw new Error(`Invalid ${service}.${conversationId}.${key}`);
    }
  };
  const optionalBoolean = (key: string) => {
    if (config[key] !== undefined && typeof config[key] !== "boolean") {
      throw new Error(`Invalid ${service}.${conversationId}.${key}`);
    }
  };
  for (const key of ["channelName", "chatName", "agentName", "updatedAt", "updatedBy"]) {
    optionalString(key);
  }
  for (const key of ["requireMention", "ignoreNoMention", "autoThread"]) optionalBoolean(key);
  if (config.mode !== undefined && config.mode !== "allow" && config.mode !== "ignore") {
    throw new Error(`Invalid ${service}.${conversationId}.mode`);
  }
  if (
    config.allowBots !== undefined &&
    !["none", "mentions", "all"].includes(String(config.allowBots))
  ) {
    throw new Error(`Invalid ${service}.${conversationId}.allowBots`);
  }
  if (
    service === "feishu" &&
    (config.allowBots !== undefined || config.ignoreNoMention !== undefined)
  ) {
    throw new Error(`Feishu conversation "${conversationId}" contains unsupported settings`);
  }
  const agentName = typeof config.agentName === "string" ? config.agentName.trim() : undefined;
  if (agentName !== undefined && !agentName) {
    throw new Error(`Invalid ${service}.${conversationId}.agentName`);
  }
  if (agentName && !isCoreMainAgentId(agentName) && !agents.has(agentName)) {
    throw new Error(`Agent "${agentName}" is not loaded`);
  }
  return { ...config, ...(agentName ? { agentName } : {}) } as LegacyChannelConfig;
}

/** One fail-closed startup transaction for the settings cutover.
 * Provider capabilities are still activation-paused when this runs. */
export function cutoverConversationSettings(input: {
  db: DrizzleDb;
  service: ConversationSettingsService;
  listAgents: () => Iterable<string>;
}): void {
  input.db.transaction((tx) => {
    const agents = new Set(input.listAgents());
    for (const service of ["discord", "feishu"] as const) {
      const key = `${service}.channels`;
      const legacyRow = tx
        .select({ value: appSettings.value })
        .from(appSettings)
        .where(eq(appSettings.key, key))
        .get();
      if (!legacyRow) continue;
      if (
        !legacyRow.value ||
        typeof legacyRow.value !== "object" ||
        Array.isArray(legacyRow.value)
      ) {
        throw new Error(`Invalid legacy settings map "${key}"`);
      }
      for (const [conversationId, rawConfig] of Object.entries(legacyRow.value)) {
        const current = tx
          .select()
          .from(romeSessions)
          .where(
            and(
              eq(romeSessions.type, "channel"),
              eq(romeSessions.sourceChannel, service),
              eq(romeSessions.sourceThreadId, conversationId),
            ),
          )
          .get();
        // Direct messages and native threads keep their runtime session rows but
        // do not own settings. Drop their legacy entries; threads fall through
        // to the parent and direct messages use connection-level policy.
        if (
          current?.sourceThreadType === "private" ||
          current?.parentSessionId ||
          current?.sourceThreadType === "topic"
        ) {
          continue;
        }
        const config = validateLegacyConfig(service, conversationId, rawConfig, agents);
        const displayName = config.channelName ?? config.chatName ?? conversationId;
        if (!current) {
          const now = new Date();
          tx.insert(romeSessions)
            .values({
              id: channelConversationId(service, conversationId),
              name: displayName,
              personaId: null,
              projectName: DEFAULT_WEBCHAT_PROJECT_NAME,
              projectPath: null,
              largeModelSelection: null,
              agentName: null,
              type: "channel",
              sourceChannel: service,
              sourceThreadId: conversationId,
              sourceThreadName: displayName,
              sourceThreadType: "channel",
              channelSettings: null,
              parentSessionId: null,
              createdAt: now,
              activityAt: now,
              lastSeenActivityAt: null,
            })
            .run();
        }

        const overrides = legacyOverrides(config);
        const routing = overrides.routing?.agentName;
        const policy = structuredClone(overrides);
        if (routing && !isCoreMainAgentId(routing)) delete policy.routing;
        if (routing && isCoreMainAgentId(routing)) policy.routing = { agentName: null };
        const stored: StoredConversationSettings = {
          schemaVersion: 1,
          overrides: policy,
          updatedAt: config.updatedAt ?? new Date().toISOString(),
          updatedBy: {
            kind: "system",
            id: "rfc-060-cutover",
            ...(config.updatedBy ? { displayName: config.updatedBy } : {}),
          },
        };
        tx.update(romeSessions)
          .set({
            name: displayName,
            sourceThreadName: displayName,
            sourceThreadType: "channel",
            channelSettings: stored,
            agentName: routing && !isCoreMainAgentId(routing) ? routing : null,
          })
          .where(
            and(
              eq(romeSessions.type, "channel"),
              eq(romeSessions.sourceChannel, service),
              eq(romeSessions.sourceThreadId, conversationId),
            ),
          )
          .run();
      }
      tx.delete(appSettings).where(eq(appSettings.key, key)).run();
    }

    tx.insert(appSettings)
      .values({
        key: "conversation_settings_cutover_v1",
        value: { completedAt: new Date().toISOString() },
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: appSettings.key,
        set: {
          value: { completedAt: new Date().toISOString() },
          updatedAt: new Date(),
        },
      })
      .run();
  });

  const rows = input.db.select().from(romeSessions).where(eq(romeSessions.type, "channel")).all();
  const connectionRows = input.db.select().from(connections).all();
  const connectionIdsByService = new Map<string, string[]>();
  for (const connection of connectionRows) {
    const ids = connectionIdsByService.get(connection.service) ?? [];
    ids.push(connection.id);
    connectionIdsByService.set(connection.service, ids);
  }
  const byId = new Map(rows.map((row) => [row.id, row]));
  for (const row of rows) {
    if (!row.sourceChannel || !row.sourceThreadId) continue;
    const connectionIds = connectionIdsByService.get(row.sourceChannel) ?? [];
    if (connectionIds.length !== 1) continue;
    const connectionId = connectionIds[0]!;
    const parent = row.parentSessionId ? byId.get(row.parentSessionId) : undefined;
    input.service.observe({
      ref: {
        connectionId,
        conversationId: row.sourceThreadId as ConversationId,
      },
      service: row.sourceChannel,
      kind:
        row.sourceThreadType === "private"
          ? "dm"
          : row.sourceThreadType === "topic"
            ? "topic"
            : row.sourceThreadType === "group"
              ? "group"
              : "channel",
      displayName: row.sourceThreadName ?? row.name,
      ...(parent?.sourceChannel === row.sourceChannel && parent.sourceThreadId
        ? {
            parent: {
              connectionId,
              conversationId: parent.sourceThreadId as ConversationId,
            },
          }
        : {}),
    });
  }
}

import type { ConversationDescriptor, ConversationRef } from "./index.js";

export const CONVERSATION_SETTING_FIELDS = [
  "enabled",
  "activation.mode",
  "activation.botMessages",
  "activation.whenOthersMentioned",
  "replies.placement",
  "routing.agentName",
  "session.reset",
] as const;

export type ConversationSettingField = (typeof CONVERSATION_SETTING_FIELDS)[number];

export type ProviderSessionResetPolicy =
  | { mode: "none" }
  | { mode: "idle"; idleMinutes: number }
  | { mode: "daily"; atHour: number };

export interface ConversationSettings {
  enabled: boolean;
  activation: {
    mode: "mention" | "all";
    botMessages: "ignore" | "mentions" | "all";
    whenOthersMentioned: "ignore" | "respond";
  };
  replies: { placement: "thread" | "inline" };
  routing: { agentName: string | null };
  session: { reset: ProviderSessionResetPolicy };
}

export interface ConversationSettingsOverrides {
  enabled?: boolean;
  activation?: Partial<ConversationSettings["activation"]>;
  replies?: Partial<ConversationSettings["replies"]>;
  routing?: Partial<ConversationSettings["routing"]>;
  session?: { reset?: ProviderSessionResetPolicy };
}

export type PartialConversationSettings = ConversationSettingsOverrides;

export interface SettingsActor {
  kind: "guardian" | "system";
  id?: string;
  displayName?: string;
}

export interface ConversationSettingsSnapshot {
  conversation: ConversationDescriptor;
  supportedFields: readonly ConversationSettingField[];
  effective: ConversationSettings;
  overrides: ConversationSettingsOverrides;
  /** Present on thread/topic reads. Such conversations have no direct
   * overrides and resolve all effective values from this settings owner. */
  inheritedFrom?: ConversationRef;
  updatedAt?: string;
  updatedBy?: SettingsActor;
}

export interface ConversationSettingsListItem {
  snapshot: ConversationSettingsSnapshot;
  availability: "online" | "offline" | "not-connected";
  source: "live" | "known" | "configured";
}

export interface ConversationSettingsPage {
  items: ConversationSettingsListItem[];
  nextCursor?: string;
}

export interface ListConversationSettingsInput {
  connectionId?: string;
  query?: string;
  cursor?: string;
  limit?: number;
  availability?: ConversationSettingsListItem["availability"];
}

export interface UpdateConversationSettingsInput {
  ref: ConversationRef;
  set: PartialConversationSettings;
  clear: ConversationSettingField[];
  actor: SettingsActor;
}

export interface ResetConversationSettingsInput {
  ref: ConversationRef;
  actor: SettingsActor;
}

export interface ConversationSettingsControl {
  list(input: ListConversationSettingsInput): Promise<ConversationSettingsPage>;
  get(ref: ConversationRef): Promise<ConversationSettingsSnapshot>;
  update(input: UpdateConversationSettingsInput): Promise<ConversationSettingsSnapshot>;
  reset(input: ResetConversationSettingsInput): Promise<ConversationSettingsSnapshot>;
}

export interface StoredConversationSettings {
  schemaVersion: 1;
  /** Policy overrides plus an optional explicit-main marker. Named routing
   * values live only in `rome_sessions.agent_name`. */
  overrides: ConversationSettingsOverrides;
  updatedAt: string;
  updatedBy: SettingsActor;
}

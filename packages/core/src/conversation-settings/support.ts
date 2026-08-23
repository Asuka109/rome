import type {
  ConversationDescriptor,
  ConversationSettingField,
  ConversationSettings,
} from "@rome-os/app-runtime";
import { DEFAULT_PROVIDER_SESSION_RESET_POLICY } from "./reset-policy.js";

export interface ConversationSettingsSupport {
  fields: readonly ConversationSettingField[];
  defaults(context: ConversationDescriptor): ConversationSettings;
}

const defaults = (): ConversationSettings => ({
  enabled: true,
  activation: {
    mode: "mention",
    botMessages: "ignore",
    whenOthersMentioned: "ignore",
  },
  replies: { placement: "thread" },
  routing: { agentName: null },
  session: { reset: structuredClone(DEFAULT_PROVIDER_SESSION_RESET_POLICY) },
});

export const CORE_CONVERSATION_SETTING_FIELDS = ["session.reset"] as const;

export const CORE_CONVERSATION_SETTINGS_SUPPORT: ConversationSettingsSupport = {
  fields: CORE_CONVERSATION_SETTING_FIELDS,
  defaults,
};

export const CONVERSATION_SETTINGS_SUPPORT: ReadonlyMap<string, ConversationSettingsSupport> =
  new Map([
    [
      "discord",
      {
        fields: [
          "enabled",
          "activation.mode",
          "activation.botMessages",
          "activation.whenOthersMentioned",
          "replies.placement",
          "routing.agentName",
          "session.reset",
        ],
        defaults,
      },
    ],
    [
      "feishu",
      {
        fields: [
          "enabled",
          "activation.mode",
          "replies.placement",
          "routing.agentName",
          "session.reset",
        ],
        defaults,
      },
    ],
    [
      "wechat",
      {
        // Admission and agent routing are enforced by the shared inbox hook,
        // independent of provider-native group policy or reply placement.
        fields: ["enabled", "routing.agentName", "session.reset"],
        defaults,
      },
    ],
  ] satisfies Array<[string, ConversationSettingsSupport]>);

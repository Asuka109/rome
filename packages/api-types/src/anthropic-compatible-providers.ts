// The Anthropic-compatible provider catalog and the wire shapes built from it.
//
// It lives here because the catalog *is* the contract: the settings route
// serves these summaries verbatim and validates a submitted provider id against
// the same keys. Any client that wants to predict either — the dashboard's mock
// backend today — has to read the identical catalog, and a hand-copied one
// drifts the moment a provider is added, renamed, or repointed.

export const CUSTOM_ANTHROPIC_PROVIDER_ID = "custom" as const;

export const ANTHROPIC_COMPATIBLE_PROVIDERS = {
  minimax: {
    id: "minimax",
    name: "MiniMax",
    baseUrl: "https://api.minimaxi.com/anthropic",
    apiKeyEnvVar: "ANTHROPIC_AUTH_TOKEN",
    env: {
      API_TIMEOUT_MS: "3000000",
      CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: "1",
      ANTHROPIC_MODEL: "MiniMax-M2.7",
      ANTHROPIC_DEFAULT_SONNET_MODEL: "MiniMax-M2.7",
      ANTHROPIC_DEFAULT_OPUS_MODEL: "MiniMax-M2.7",
      ANTHROPIC_DEFAULT_HAIKU_MODEL: "MiniMax-M2.7",
    },
  },
  "minimax-intl": {
    id: "minimax-intl",
    name: "MiniMax (International)",
    baseUrl: "https://api.minimax.io/anthropic",
    apiKeyEnvVar: "ANTHROPIC_AUTH_TOKEN",
    env: {
      API_TIMEOUT_MS: "3000000",
      CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: "1",
      ANTHROPIC_MODEL: "MiniMax-M2.7",
      ANTHROPIC_DEFAULT_SONNET_MODEL: "MiniMax-M2.7",
      ANTHROPIC_DEFAULT_OPUS_MODEL: "MiniMax-M2.7",
      ANTHROPIC_DEFAULT_HAIKU_MODEL: "MiniMax-M2.7",
    },
  },
  "z-ai": {
    id: "z-ai",
    name: "Z.ai",
    baseUrl: "https://api.z.ai/api/anthropic",
    apiKeyEnvVar: "ANTHROPIC_AUTH_TOKEN",
    env: {
      API_TIMEOUT_MS: "3000000",
    },
  },
  kimi: {
    id: "kimi",
    name: "Kimi",
    baseUrl: "https://api.kimi.com/coding/",
    apiKeyEnvVar: "ANTHROPIC_API_KEY",
    env: {
      ENABLE_TOOL_SEARCH: "false",
    },
  },
  deepseek: {
    id: "deepseek",
    name: "DeepSeek",
    baseUrl: "https://api.deepseek.com/anthropic",
    apiKeyEnvVar: "ANTHROPIC_AUTH_TOKEN",
    env: {
      ANTHROPIC_MODEL: "deepseek-v4-pro[1m]",
      ANTHROPIC_DEFAULT_OPUS_MODEL: "deepseek-v4-pro[1m]",
      ANTHROPIC_DEFAULT_SONNET_MODEL: "deepseek-v4-pro[1m]",
      ANTHROPIC_DEFAULT_HAIKU_MODEL: "deepseek-v4-flash",
      CLAUDE_CODE_SUBAGENT_MODEL: "deepseek-v4-flash",
      CLAUDE_CODE_EFFORT_LEVEL: "high",
    },
  },
  meta: {
    id: "meta",
    name: "Meta",
    baseUrl: "https://api.meta.ai",
    apiKeyEnvVar: "ANTHROPIC_AUTH_TOKEN",
    env: {
      ANTHROPIC_MODEL: "muse-spark-1.1",
      ANTHROPIC_DEFAULT_OPUS_MODEL: "muse-spark-1.1",
      ANTHROPIC_DEFAULT_SONNET_MODEL: "muse-spark-1.1",
      ANTHROPIC_DEFAULT_HAIKU_MODEL: "muse-spark-1.1",
      CLAUDE_CODE_SUBAGENT_MODEL: "muse-spark-1.1",
    },
  },
} as const;

export type AnthropicCompatibleProviderId = keyof typeof ANTHROPIC_COMPATIBLE_PROVIDERS;
export type AnthropicCompatibleConfigurationId =
  | AnthropicCompatibleProviderId
  | typeof CUSTOM_ANTHROPIC_PROVIDER_ID;

export interface StoredPresetAnthropicCompatibleCredentials {
  provider: AnthropicCompatibleProviderId;
  apiKey: string;
  updatedAt: string;
}

export interface StoredCustomAnthropicCompatibleCredentials {
  provider: typeof CUSTOM_ANTHROPIC_PROVIDER_ID;
  env: Record<string, string>;
  updatedAt: string;
}

export type StoredAnthropicCompatibleCredentials =
  | StoredPresetAnthropicCompatibleCredentials
  | StoredCustomAnthropicCompatibleCredentials;

export interface AnthropicCompatibleProviderSummary {
  id: AnthropicCompatibleConfigurationId;
  name: string;
  kind: "preset" | "custom";
  baseUrl?: string;
  apiKeyEnvVar?: string;
}

export interface AnthropicCompatibleCredentialsSummary {
  provider: AnthropicCompatibleConfigurationId;
  providerName: string;
  hasApiKey: boolean;
  updatedAt: string;
}

export function isAnthropicCompatibleProviderId(
  value: unknown,
): value is AnthropicCompatibleProviderId {
  return typeof value === "string" && Object.hasOwn(ANTHROPIC_COMPATIBLE_PROVIDERS, value);
}

export function isAnthropicCompatibleConfigurationId(
  value: unknown,
): value is AnthropicCompatibleConfigurationId {
  return value === CUSTOM_ANTHROPIC_PROVIDER_ID || isAnthropicCompatibleProviderId(value);
}

export function listAnthropicCompatibleProviderSummaries(): AnthropicCompatibleProviderSummary[] {
  return [
    ...Object.values(ANTHROPIC_COMPATIBLE_PROVIDERS).map((provider) => ({
      id: provider.id,
      name: provider.name,
      kind: "preset" as const,
      baseUrl: provider.baseUrl,
      apiKeyEnvVar: provider.apiKeyEnvVar,
    })),
    {
      id: CUSTOM_ANTHROPIC_PROVIDER_ID,
      name: "Custom",
      kind: "custom",
    },
  ];
}

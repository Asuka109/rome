// Validation for a custom Anthropic-compatible provider's environment block.
//
// It lives here rather than in core because both sides of the wire need it:
// the settings route rejects an invalid block, and any client that wants to
// predict that rejection — the dashboard's mock backend today — must apply the
// identical rules. Two copies of a rule this specific drift silently, and the
// drift shows up as a client reporting success for a request the server always
// refuses. Pure and dependency-free so it can be imported from either side.

export type CustomAnthropicEnvValidationResult =
  | { ok: true; env: Record<string, string> }
  | { ok: false; error: string };

const CUSTOM_ENV_KEY_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;
const CUSTOM_ENV_MAX_ENTRIES = 64;
const CUSTOM_ENV_MAX_KEY_LENGTH = 128;
const CUSTOM_ENV_MAX_VALUE_LENGTH = 8_192;
const CUSTOM_ENV_MAX_TOTAL_LENGTH = 65_536;
const CUSTOM_ENV_ALLOWED_EXACT = new Set(["API_TIMEOUT_MS", "ENABLE_TOOL_SEARCH"]);
const CUSTOM_ENV_BLOCKED_KEYS = new Set([
  "CLAUDE_CODE_ENABLE_TELEMETRY",
  "CLAUDE_CODE_OAUTH_TOKEN",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function isAllowedCustomAnthropicEnvKey(key: string): boolean {
  if (CUSTOM_ENV_BLOCKED_KEYS.has(key)) return false;
  return (
    key.startsWith("ANTHROPIC_") ||
    key.startsWith("CLAUDE_CODE_") ||
    CUSTOM_ENV_ALLOWED_EXACT.has(key)
  );
}

/** Returns the normalized env on success, or the first rule the block breaks.
 *  Exactly one of ANTHROPIC_AUTH_TOKEN / ANTHROPIC_API_KEY must be present and
 *  non-empty; ANTHROPIC_BASE_URL, when given, must be an http(s) URL. */
export function validateCustomAnthropicEnv(value: unknown): CustomAnthropicEnvValidationResult {
  if (!isRecord(value)) {
    return { ok: false, error: "Environment variables must be a JSON object" };
  }

  const entries = Object.entries(value);
  if (entries.length === 0) {
    return { ok: false, error: "At least one environment variable is required" };
  }
  if (entries.length > CUSTOM_ENV_MAX_ENTRIES) {
    return {
      ok: false,
      error: `No more than ${CUSTOM_ENV_MAX_ENTRIES} environment variables are allowed`,
    };
  }

  const env: Record<string, string> = {};
  let totalLength = 0;
  for (const [key, rawValue] of entries) {
    if (!CUSTOM_ENV_KEY_PATTERN.test(key) || key.length > CUSTOM_ENV_MAX_KEY_LENGTH) {
      return { ok: false, error: `Invalid environment variable name: ${key || "(empty)"}` };
    }
    if (!isAllowedCustomAnthropicEnvKey(key)) {
      return { ok: false, error: `Environment variable is not allowed: ${key}` };
    }
    if (typeof rawValue !== "string") {
      return { ok: false, error: `Environment variable ${key} must be a string` };
    }
    if (rawValue.length > CUSTOM_ENV_MAX_VALUE_LENGTH) {
      return { ok: false, error: `Environment variable ${key} is too long` };
    }
    totalLength += key.length + rawValue.length;
    if (totalLength > CUSTOM_ENV_MAX_TOTAL_LENGTH) {
      return { ok: false, error: "Environment variable configuration is too large" };
    }
    env[key] = rawValue;
  }

  const authKeys = ["ANTHROPIC_AUTH_TOKEN", "ANTHROPIC_API_KEY"].filter((key) =>
    Object.hasOwn(env, key),
  );
  const authKey = authKeys[0];
  if (authKeys.length !== 1 || !authKey || !env[authKey]?.trim()) {
    return {
      ok: false,
      error: "Provide exactly one of ANTHROPIC_AUTH_TOKEN or ANTHROPIC_API_KEY",
    };
  }

  const baseUrl = env.ANTHROPIC_BASE_URL;
  if (baseUrl) {
    try {
      const parsed = new URL(baseUrl);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        return { ok: false, error: "ANTHROPIC_BASE_URL must use http or https" };
      }
    } catch {
      return { ok: false, error: "ANTHROPIC_BASE_URL must be a valid URL" };
    }
  }

  return { ok: true, env };
}

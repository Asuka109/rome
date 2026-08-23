/**
 * `FEATURE_GATE_*` environment overrides — a vendor-neutral way to force any
 * gate on or off from the environment, independent of the active backend.
 *
 * `FEATURE_GATE_<NAME>=<bool>` forces the gate `<name>` (the suffix, lowercased)
 * to the given value. The override wins over whatever backend is installed —
 * Statsig or the all-off default — so it works with no Statsig project wired:
 *   - local dev / CI: enable a feature without standing up a Statsig gate;
 *   - break-glass: pin a gate on/off instantly when the backend is down.
 *
 * Statsig is not consulted for an overridden gate, so this needs no SDK and no
 * network. Recognized boolean tokens only; an unrecognized value fails loudly
 * (a typo must not silently flip a gate). Blank/unset means "no override".
 *
 *   FEATURE_GATE_ROME_CLOUD_AUTH=on   → checkGate("rome_cloud_auth", …) === true
 */
import { setGateOverride } from "./index.js";

const ENV_PREFIX = "FEATURE_GATE_";
const TRUE_TOKENS = ["1", "true", "yes", "on"];
const FALSE_TOKENS = ["0", "false", "no", "off"];

/** Parse one flag value. `undefined` for blank/unset; throws on an unknown token. */
function parseFlag(envKey: string, value: string): boolean | undefined {
  const token = value.trim().toLowerCase();
  if (token === "") return undefined;
  if (TRUE_TOKENS.includes(token)) return true;
  if (FALSE_TOKENS.includes(token)) return false;
  throw new Error(
    `Invalid ${envKey} value "${value}": expected one of ` +
      `${[...TRUE_TOKENS, ...FALSE_TOKENS].join(", ")}.`,
  );
}

/** Collect `FEATURE_GATE_<NAME>` env vars into a gate-name → boolean map. */
export function parseGateOverrides(env: NodeJS.ProcessEnv): Map<string, boolean> {
  const overrides = new Map<string, boolean>();
  for (const [key, value] of Object.entries(env)) {
    if (value === undefined || !key.startsWith(ENV_PREFIX)) continue;
    const gateName = key.slice(ENV_PREFIX.length).toLowerCase();
    if (gateName === "") continue;
    const parsed = parseFlag(key, value);
    if (parsed !== undefined) overrides.set(gateName, parsed);
  }
  return overrides;
}

/**
 * Apply the `FEATURE_GATE_*` overrides found in `env`. Each forces its gate
 * regardless of which backend is (or later becomes) active. Returns the gate
 * names that were overridden (for boot logging).
 */
export function installEnvGateOverrides(env: NodeJS.ProcessEnv): string[] {
  const overrides = parseGateOverrides(env);
  for (const [gateName, value] of overrides) setGateOverride(gateName, value);
  return [...overrides.keys()];
}

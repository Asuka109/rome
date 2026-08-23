/**
 * Remembered-instance persistence for the shell (Phase 1 design §3).
 *
 * After the user reaches their instance from Rome Cloud once (an explicit
 * selection — see `saveInstanceOrigin`), its origin is persisted — scoped to
 * the environment it was remembered under (see `StoredInstance`) — so the
 * next cold start goes straight there instead of Rome Cloud. An origin is not a
 * secret, so plain key-value storage is fine (AsyncStorage in the app).
 *
 * Storage is injected via `KeyValueStorage` (structurally satisfied by
 * `@react-native-async-storage/async-storage`) so this module stays free of
 * React Native imports and unit-testable under node — the same "pure decision
 * logic, side effects in the caller" split as `origin-allowlist.ts`. Storage
 * failures are swallowed (with a warning): persistence is a convenience, and
 * a broken store must degrade to "start at Rome Cloud", never block navigation.
 */
import { isInstanceUrl, type OriginPolicy } from "./origin-allowlist";

export interface KeyValueStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export const INSTANCE_ORIGIN_KEY = "rome.instance-origin";

/**
 * What is persisted under `INSTANCE_ORIGIN_KEY`: the remembered origin plus
 * the environment it was remembered under. Scoping the value to the
 * configured Rome Cloud/instance-domain pair means a value written by a build
 * pointed at one environment is never honored by a build pointed at another —
 * belt-and-suspenders on top of the load-time `isInstanceUrl` policy check,
 * which already rejects cross-domain leftovers but cannot distinguish two
 * environments that share an `instanceDomain` while differing in
 * `romeCloudOrigin`.
 */
interface StoredInstance {
  origin: string;
  romeCloudOrigin: string;
  instanceDomain: string;
}

function parseStoredInstance(raw: string): StoredInstance | null {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    // Unparseable — includes the legacy bare-origin format, which carried no
    // environment metadata and is simply forgotten (a one-time re-remember).
    return null;
  }
  if (typeof value !== "object" || value === null) return null;
  const candidate = value as Record<string, unknown>;
  // Builds before the Rome Cloud rename wrote this field as `pantheonOrigin`
  // under the same storage key, so a shipped app upgrading into this build
  // still finds its own record here. Rejecting the old name would forget the
  // remembered instance and bounce the user back to Rome Cloud on first
  // launch. Read either name; `saveInstanceOrigin` only ever writes the
  // current one, so a record migrates the next time it is written.
  const romeCloudOrigin =
    typeof candidate.romeCloudOrigin === "string"
      ? candidate.romeCloudOrigin
      : candidate.pantheonOrigin;
  if (
    typeof candidate.origin !== "string" ||
    typeof romeCloudOrigin !== "string" ||
    typeof candidate.instanceDomain !== "string"
  ) {
    return null;
  }
  return {
    origin: candidate.origin,
    romeCloudOrigin,
    instanceDomain: candidate.instanceDomain,
  };
}

/**
 * Read the remembered instance origin, or null if absent/unusable. A stored
 * value the *current* policy rejects (instance domain changed between builds,
 * corruption), or one remembered under a different environment
 * (Rome Cloud/instance-domain mismatch), is cleared and ignored — the shell
 * must never navigate to an origin the current build's policy wouldn't allow.
 */
export async function loadInstanceOrigin(
  storage: KeyValueStorage,
  policy: OriginPolicy,
): Promise<string | null> {
  let raw: string | null;
  try {
    raw = await storage.getItem(INSTANCE_ORIGIN_KEY);
  } catch (error) {
    console.warn("[rome-mobile] failed to read remembered instance", error);
    return null;
  }
  if (raw === null) return null;
  const stored = parseStoredInstance(raw);
  if (
    stored === null ||
    stored.romeCloudOrigin !== policy.romeCloudOrigin ||
    stored.instanceDomain !== policy.instanceDomain ||
    !isInstanceUrl(stored.origin, policy)
  ) {
    await clearInstanceOrigin(storage);
    return null;
  }
  return new URL(stored.origin).origin;
}

/**
 * Persist the origin of `url` iff it is an instance URL under the current
 * policy AND the hop into it came from Rome Cloud (`previousUrl`'s origin is
 * `policy.romeCloudOrigin`). "Remember my Rome" must be gated on a stronger
 * signal than "the URL matches the shared instance domain": Phase 1 trusts
 * every `<slug>.<instanceDomain>` for navigation, so without this gate a
 * typoed or malicious cross-instance link would silently re-point every
 * future cold start at another tenant. A Rome Cloud → instance transition is
 * the user explicitly selecting their instance (or Rome Cloud's own login
 * callback redirecting into it), so only that hop is remembered. Only the
 * bare origin is stored — paths/queries can carry transient auth material and
 * the cold start should land on the instance root anyway.
 *
 * Returns the accepted instance origin so in-process consumers can switch to
 * the same remembered instance without duplicating this transition policy.
 * Returns `null` when the navigation must not change the remembered instance.
 *
 * Exact-origin pages (Rome Cloud, auth hosts) are never remembered, even if they
 * would also match the instance-domain rule: if Rome Cloud is ever deployed as a
 * single-label subdomain of the instance domain (e.g. `cloud.rome.example`
 * under `rome.example`), `isInstanceUrl` would match it too, and every
 * Rome Cloud page view would overwrite the remembered instance. Checking
 * `exactOrigins` first keeps exact-origin pages from ever being stored.
 */
export async function saveInstanceOrigin(
  storage: KeyValueStorage,
  url: string,
  policy: OriginPolicy,
  previousUrl: string | null,
): Promise<string | null> {
  if (previousUrl === null) return null;
  let previousOrigin: string;
  try {
    previousOrigin = new URL(previousUrl).origin;
  } catch {
    return null;
  }
  if (previousOrigin !== policy.romeCloudOrigin) return null;

  let origin: string | null;
  try {
    origin = new URL(url).origin;
  } catch {
    origin = null;
  }
  if (origin !== null && policy.exactOrigins.has(origin)) return null;
  if (!isInstanceUrl(url, policy)) return null;
  const stored: StoredInstance = {
    origin: new URL(url).origin,
    romeCloudOrigin: policy.romeCloudOrigin,
    instanceDomain: policy.instanceDomain,
  };
  try {
    await storage.setItem(INSTANCE_ORIGIN_KEY, JSON.stringify(stored));
  } catch (error) {
    console.warn("[rome-mobile] failed to persist remembered instance", error);
    return null;
  }
  return stored.origin;
}

/** Forget the remembered instance (the error screen's "Back to Rome home"). */
export async function clearInstanceOrigin(storage: KeyValueStorage): Promise<void> {
  try {
    await storage.removeItem(INSTANCE_ORIGIN_KEY);
  } catch (error) {
    console.warn("[rome-mobile] failed to clear remembered instance", error);
  }
}

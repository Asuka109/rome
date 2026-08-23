/**
 * Generic OIDC `id_token` primitives — the asymmetric sign/verify mirror plus
 * the JWKS key handling both halves must agree on. Domain-free: the caller
 * supplies the key material, claims, issuer/audience, and supported scopes; this
 * module holds no env, DB, config, or product-specific scope/client logic.
 *
 * ES256 only. The issuer signs with a `kid`-tagged EC P-256 key; the verifier
 * fetches the issuer's JWKS, selects the key by `kid`, and checks the signature
 * plus `iss`/`aud`/`exp` (and `nonce` when one was sent).
 */
import { createHash, createPublicKey, type KeyObject } from "node:crypto";
import jwt, { type JwtPayload } from "jsonwebtoken";

export const ID_TOKEN_ALG = "ES256";

/**
 * `kid` = first 16 hex of sha256(DER SPKI public key). Deterministic from the
 * key itself, so rotating the key (or adding a second) yields a distinct `kid`
 * with no extra config — clients select by `kid`, making a future key additive.
 */
export function deriveKid(publicKey: KeyObject): string {
  const der = publicKey.export({ type: "spki", format: "der" });
  return createHash("sha256").update(der).digest("hex").slice(0, 16);
}

/** A public key as a published JWK: the raw JWK fields plus `kid`/`use`/`alg`. */
export function publicKeyToJwk(publicKey: KeyObject, kid: string): Record<string, unknown> {
  const jwk = publicKey.export({ format: "jwk" }) as Record<string, unknown>;
  return { ...jwk, kid, use: "sig", alg: ID_TOKEN_ALG };
}

export interface SignIdTokenInput {
  privateKey: KeyObject;
  /** Stamped into the JWT header so verifiers can select the key. */
  kid: string;
  subject: string;
  audience: string;
  issuer: string;
  expiresInSeconds: number;
  /** Echoed as `nonce` when present (request/response binding). */
  nonce?: string | null;
  email?: string | null;
  picture?: string | null;
  /** Any additional claims to fold into the payload. */
  extraClaims?: Record<string, unknown>;
}

/** Mint an ES256 id_token. The verifier trusts `sub` as the authenticated subject. */
export function signIdToken(input: SignIdTokenInput): string {
  const payload: Record<string, unknown> = { ...input.extraClaims };
  if (input.nonce) payload.nonce = input.nonce;
  if (input.email) payload.email = input.email;
  if (input.picture) payload.picture = input.picture;
  return jwt.sign(payload, input.privateKey, {
    algorithm: ID_TOKEN_ALG,
    keyid: input.kid,
    subject: input.subject,
    audience: input.audience,
    issuer: input.issuer,
    expiresIn: input.expiresInSeconds,
  });
}

interface Jwk {
  kid?: unknown;
  [key: string]: unknown;
}

interface CachedKey {
  key: KeyObject;
  /** Epoch ms after which this entry is stale and must be re-fetched. */
  expiresAt: number;
}

// Cache resolved public keys by (jwksUri, kid), each with a TTL. A hit within the
// TTL avoids refetching JWKS on every verify; an unknown `kid` OR an expired entry
// triggers a refetch. The TTL is what makes key *revocation* tractable: when the
// issuer drops a compromised `kid` from its JWKS, instances stop accepting tokens
// for it within one TTL window rather than only after a full restart.
const keyCache = new Map<string, CachedKey>();

const DEFAULT_JWKS_TTL_MS = 5 * 60_000;

function cacheKey(jwksUri: string, kid: string): string {
  return `${jwksUri}#${kid}`;
}

// Honour the JWKS endpoint's own `cache-control: max-age` so the client TTL
// tracks the server's stated freshness; clamp to the default otherwise.
function parseMaxAgeMs(res: Response): number {
  const match = res.headers.get("cache-control")?.match(/max-age=(\d+)/i);
  if (match) {
    const seconds = Number(match[1]);
    if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1000;
  }
  return DEFAULT_JWKS_TTL_MS;
}

async function fetchJwks(
  jwksUri: string,
  fetchImpl: typeof fetch,
): Promise<{ keys: Jwk[]; ttlMs: number }> {
  const res = await fetchImpl(jwksUri, { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`jwks fetch failed: ${res.status}`);
  const body = (await res.json()) as { keys?: unknown };
  return {
    keys: Array.isArray(body.keys) ? (body.keys as Jwk[]) : [],
    ttlMs: parseMaxAgeMs(res),
  };
}

async function resolveSigningKey(
  kid: string,
  jwksUri: string,
  fetchImpl: typeof fetch,
): Promise<KeyObject> {
  const now = Date.now();
  const cached = keyCache.get(cacheKey(jwksUri, kid));
  if (cached && cached.expiresAt > now) return cached.key;

  // Cache miss or expired entry: reload the whole set, re-stamp every key with a
  // fresh expiry, and resolve the requested `kid` from *this* fetch — a `kid` the
  // issuer has since dropped is simply absent here, so it fails closed even if a
  // stale (now-expired) cache entry for it still lingers.
  const { keys, ttlMs } = await fetchJwks(jwksUri, fetchImpl);
  const expiresAt = now + ttlMs;
  let resolved: KeyObject | undefined;
  for (const jwk of keys) {
    if (typeof jwk.kid !== "string") continue;
    const key = createPublicKey({ key: jwk as JsonWebKey, format: "jwk" });
    keyCache.set(cacheKey(jwksUri, jwk.kid), { key, expiresAt });
    if (jwk.kid === kid) resolved = key;
  }
  if (!resolved) throw new Error(`no JWKS key for kid ${kid}`);
  return resolved;
}

export interface VerifyIdTokenOptions {
  issuer: string;
  audience: string;
  /** The `nonce` sent at the authorize leg; rejected if the token omits/mismatches it. */
  nonce?: string | null;
  jwksUri: string;
  /** Override fetch (tests). Defaults to global `fetch`. */
  fetch?: typeof fetch;
}

export interface VerifiedIdToken {
  sub: string;
  email?: string;
  picture?: string;
  /** The full verified payload, for callers needing other claims. */
  payload: JwtPayload;
}

/**
 * Verify an id_token end-to-end. Throws on any failure (bad signature, wrong
 * `iss`/`aud`, expiry, missing/garbled claims, nonce mismatch) — callers treat a
 * throw as "could not establish identity".
 */
export async function verifyIdToken(
  token: string,
  opts: VerifyIdTokenOptions,
): Promise<VerifiedIdToken> {
  const fetchImpl = opts.fetch ?? globalThis.fetch;
  const decoded = jwt.decode(token, { complete: true });
  if (!decoded || typeof decoded === "string") throw new Error("malformed id_token");
  const kid = decoded.header.kid;
  if (!kid) throw new Error("id_token missing kid");

  const key = await resolveSigningKey(kid, opts.jwksUri, fetchImpl);
  const payload = jwt.verify(token, key, {
    algorithms: [ID_TOKEN_ALG],
    audience: opts.audience,
    issuer: opts.issuer,
  }) as JwtPayload;

  if (typeof payload.sub !== "string" || payload.sub === "") {
    throw new Error("id_token missing sub");
  }
  if (opts.nonce != null && payload.nonce !== opts.nonce) {
    throw new Error("id_token nonce mismatch");
  }
  const email = typeof payload.email === "string" ? payload.email : undefined;
  const picture = typeof payload.picture === "string" ? payload.picture : undefined;
  return { sub: payload.sub, email, picture, payload };
}

export interface DiscoveryMetadataInput {
  issuer: string;
  /** The scopes this issuer advertises (the one product-specific input). */
  scopesSupported: string[];
}

/**
 * Build an OIDC discovery document for the authorization-code + PKCE-S256 + ES256
 * flow these primitives implement. Endpoints are derived from `issuer`.
 */
export function buildDiscoveryMetadata(input: DiscoveryMetadataInput): Record<string, unknown> {
  const { issuer } = input;
  return {
    issuer,
    authorization_endpoint: `${issuer}/oauth2/authorize`,
    token_endpoint: `${issuer}/oauth2/token`,
    jwks_uri: `${issuer}/oauth2/jwks`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code"],
    scopes_supported: input.scopesSupported,
    subject_types_supported: ["public"],
    id_token_signing_alg_values_supported: [ID_TOKEN_ALG],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: ["none"],
  };
}

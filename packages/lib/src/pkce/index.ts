/**
 * PKCE (RFC 7636, S256) — the generation and verification halves of the
 * proof-key scheme, shared so a client (which mints the verifier) and an
 * authorization server (which checks it) can never drift on the alphabet,
 * length envelope, or hashing. Pure base64url + SHA-256; no domain, no I/O.
 *
 * S256 only: `code_challenge = base64url(sha256(code_verifier))`. The verifier
 * is high-entropy random; only its challenge is sent on the front channel, and
 * possession of the verifier is proved at the token leg.
 */
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

// A challenge/verifier is 43–128 base64url chars (RFC 7636 §4.1). 32 random
// bytes → 43 chars, the low end of the range.
export const CODE_CHALLENGE_RE = /^[A-Za-z0-9_-]{43,128}$/;
export const CODE_VERIFIER_RE = /^[A-Za-z0-9_-]{43,128}$/;

export interface PkcePair {
  verifier: string;
  challenge: string;
}

/** Mint a fresh verifier + its S256 challenge (client side). */
export function createPkce(): PkcePair {
  const verifier = randomBytes(32).toString("base64url");
  return { verifier, challenge: computeS256Challenge(verifier) };
}

/** `base64url(sha256(verifier))` — the S256 transform, exposed on its own. */
export function computeS256Challenge(verifier: string): string {
  return createHash("sha256").update(verifier).digest("base64url");
}

/** Trim + format-validate a presented challenge; null if it isn't a valid one. */
export function normalizeCodeChallenge(value: string | null | undefined): string | null {
  const challenge = value?.trim() ?? "";
  return CODE_CHALLENGE_RE.test(challenge) ? challenge : null;
}

/**
 * Verify a presented verifier hashes to the stored challenge (server side).
 * Constant-time compare; rejects a malformed verifier before hashing.
 */
export function verifyPkceChallenge(codeVerifier: string, codeChallenge: string): boolean {
  if (!CODE_VERIFIER_RE.test(codeVerifier)) return false;
  const a = Buffer.from(computeS256Challenge(codeVerifier));
  const b = Buffer.from(codeChallenge);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

// Connection grant ledger. Messaging model: docs/concepts/messaging.md.
//
// Invariants the implementations and tests hold:
//  1. Runtime never reads inside `material` — only the envelope (`expiresAt`, kind).
//  2. Rehydration needs code, never the guardian: a persisted credential +
//     descriptor ⇒ a live capability at boot.
//  3. Rows record outcomes only — no step/flow state, no scheme-specific columns.
//  4. One grant = one credential row; renewal and kit.persist replace it in place.
//  5. Grant rows exist from connection creation in "unauthorized"; conferral
//     FILLS them.

import type { ConnectionId, GrantName, GrantState, ProfileRecord, SecretRecord } from "./types.js";

export interface ConnectionRecord {
  id: ConnectionId;
  service: string;
  label: string;
  createdAt: Date;
}

/**
 * The persisted form of a `Credential`. Inline custody stores the secret record
 * verbatim; external custody (`{ kind: "external" }`) stores no secret — the
 * live material comes from the scheme's `resolveExternal` resolver at rehydration.
 */
export interface PersistedCredential {
  material: { kind: "inline"; record: SecretRecord } | { kind: "external" };
  expiresAt: Date | "never";
}

export interface GrantRecord {
  custody: string; // connectionId
  name: GrantName;
  state: GrantState;
  credential?: PersistedCredential; // present ⇔ state !== "unauthorized"
  /** The non-secret half of the conferral outcome, written in the
   *  SAME update as `credential` — never through a separate setter. Absent until
   *  a conferral supplies one; degrade preserves it (no wipe), revoke clears it. */
  profile?: ProfileRecord;
  /** When the last conferral filled this grant. Retained through `revoke()` —
   *  see {@link isExplicitlyRevoked}. */
  conferredAt?: Date;
  lastRenewedAt?: Date;
  degraded?: { at: Date; reason: string };
}

/**
 * True iff this grant was explicitly revoked by the guardian. `revoke()` is the
 * only conferred→unauthorized transition, and it clears the credential/profile
 * but deliberately RETAINS `conferredAt` — so an unauthorized grant with a
 * conferral on record is a guardian-initiated disconnect, distinguishable from a
 * never-conferred grant (a fresh `ensureGrant` row has no `conferredAt`). The
 * boot settings bridge reads this to refuse resurrecting a disconnected
 * credential from a retained legacy settings row; a NEW conferral
 * (`importCredential`) stamps a fresh `conferredAt` and clears the marker's
 * meaning by flipping the state back to authorized.
 */
export function isExplicitlyRevoked(rec: GrantRecord | null | undefined): boolean {
  return rec?.state === "unauthorized" && rec.conferredAt !== undefined;
}

export interface GrantLedger {
  createConnection(rec: ConnectionRecord): Promise<void>;
  listConnections(): Promise<ConnectionRecord[]>;
  /** Cascades the connection's grant rows. */
  deleteConnection(id: ConnectionId): Promise<void>;
  /** Idempotent; creates the row in "unauthorized" if absent. */
  ensureGrant(custody: string, name: GrantName): Promise<void>;
  getGrant(custody: string, name: GrantName): Promise<GrantRecord | null>;
  listGrants(custody: string): Promise<GrantRecord[]>;
  updateGrant(
    custody: string,
    name: GrantName,
    patch: Partial<
      Pick<
        GrantRecord,
        "state" | "credential" | "profile" | "conferredAt" | "lastRenewedAt" | "degraded"
      >
    >,
  ): Promise<void>;
}

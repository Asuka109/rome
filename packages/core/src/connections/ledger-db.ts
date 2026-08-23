// Drizzle-backed grant ledger. Messaging model: docs/concepts/messaging.md.
// Persists connections and grants into the `connections` / `connection_grants` tables. The registry
// contract suites (registry-*.test.ts) run against this implementation.
//
// The `credential` column stores a PersistedCredential envelope as plain JSON
// (repo precedent: encryption deliberately dropped — see
// `packages/core/src/lib/provider-accounts.ts`). The envelope shape is kept so
// encryption can return later. The runtime never reads inside `material`.

import { and, eq } from "drizzle-orm";
import type { DrizzleDb, DrizzleTx, SqliteExec } from "../db/index.js";
import { connectionGrants, connections } from "../db/schema/system.js";
import { ServiceConnectionWriteConflict } from "./errors.js";
import type { ConnectionId, GrantName, ProfileRecord } from "./types.js";
import type { ConnectionRecord, GrantLedger, GrantRecord, PersistedCredential } from "./ledger.js";

/** The patch shape shared by `updateGrant` and its write helper. */
type GrantPatch = Partial<
  Pick<
    GrantRecord,
    "state" | "credential" | "profile" | "conferredAt" | "lastRenewedAt" | "degraded"
  >
>;

/** A ledger that can also enlist its writes in a caller-owned transaction. Only
 *  the Drizzle-backed ledger implements it; the registry's terminal conferral
 *  (`confer`) needs it to write the credential, a placeholder connection, and the
 *  guardian mapping atomically in one transaction. Each `write*` helper takes an
 *  executor (`this.db` for autocommit, or a `tx`), so one body serves both the
 *  plain async methods and the transaction. The abstract `GrantLedger`
 *  deliberately stays transaction-free so the in-memory test fakes need not model
 *  a transaction they never exercise. */
export interface TransactionalGrantLedger extends GrantLedger {
  /** Run `fn` inside one synchronous transaction (better-sqlite3). Any throw
   *  rolls the whole scope back. */
  runInTransaction<T>(fn: (tx: DrizzleTx) => T): T;
  /** Like {@link GrantLedger.deleteConnection}, but enlists an optional caller
   *  participant in the SAME transaction as the cascading deletes — so a
   *  teardown side-write (e.g. guardian channel-mapping cleanup) commits
   *  atomically with the connection removal instead of as a separate write that
   *  can strand state if it fails after the connection is already gone. */
  deleteConnection(id: ConnectionId, inTx?: (tx: DrizzleTx) => void): Promise<void>;
  writeConnection(exec: SqliteExec, rec: ConnectionRecord): void;
  writeEnsureGrant(exec: SqliteExec, custody: string, name: GrantName): void;
  writeGrant(exec: SqliteExec, custody: string, name: GrantName, patch: GrantPatch): void;
}

/** Narrowing guard: a ledger that supports caller-owned transactions. */
export function isTransactionalLedger(ledger: GrantLedger): ledger is TransactionalGrantLedger {
  return typeof (ledger as Partial<TransactionalGrantLedger>).runInTransaction === "function";
}

type GrantRow = typeof connectionGrants.$inferSelect;

function isServiceUniqueConstraint(error: unknown): boolean {
  const dbError = error as { code?: unknown; constraint?: unknown; message?: unknown };
  if (dbError.code === "23505") return dbError.constraint === "connections_service_unique";
  return (
    typeof dbError.code === "string" &&
    dbError.code.startsWith("SQLITE_CONSTRAINT") &&
    typeof dbError.message === "string" &&
    dbError.message.includes("UNIQUE constraint failed: connections.service")
  );
}

/** Revive a JSON-decoded PersistedCredential. The `credential` column is stored
 *  as plain JSON, so `expiresAt` comes back as an ISO string (or "never") rather
 *  than a Date — reconstitute it so the runtime sees the same shape the in-memory
 *  ledger returns (the runtime only reads the envelope). */
function reviveCredential(raw: unknown): PersistedCredential {
  const persisted = raw as PersistedCredential;
  const expiresAt =
    persisted.expiresAt === "never" ? "never" : new Date(persisted.expiresAt as unknown as string);
  return { material: persisted.material, expiresAt };
}

function rowToGrant(row: GrantRow): GrantRecord {
  const rec: GrantRecord = {
    custody: row.custody,
    name: row.name,
    state: row.state as GrantRecord["state"],
  };
  if (row.credential !== null) rec.credential = reviveCredential(row.credential);
  if (row.profile !== null) rec.profile = row.profile as ProfileRecord;
  if (row.conferredAt !== null) rec.conferredAt = row.conferredAt;
  if (row.lastRenewedAt !== null) rec.lastRenewedAt = row.lastRenewedAt;
  if (row.degradedAt !== null) {
    rec.degraded = { at: row.degradedAt, reason: row.degradedReason ?? "" };
  }
  return rec;
}

export class DrizzleGrantLedger implements TransactionalGrantLedger {
  constructor(private readonly db: DrizzleDb) {}

  runInTransaction<T>(fn: (tx: DrizzleTx) => T): T {
    return this.db.transaction(fn);
  }

  writeConnection(exec: SqliteExec, rec: ConnectionRecord): void {
    try {
      exec
        .insert(connections)
        .values({
          id: rec.id,
          service: rec.service,
          label: rec.label,
          createdAt: rec.createdAt,
        })
        .run();
    } catch (error) {
      if (isServiceUniqueConstraint(error)) {
        throw new ServiceConnectionWriteConflict(rec.service, error);
      }
      throw error;
    }
  }

  async createConnection(rec: ConnectionRecord): Promise<void> {
    this.writeConnection(this.db, rec);
  }

  async listConnections(): Promise<ConnectionRecord[]> {
    const rows = await this.db.select().from(connections);
    return rows.map((row) => ({
      id: row.id,
      service: row.service,
      label: row.label,
      createdAt: row.createdAt,
    }));
  }

  async deleteConnection(id: ConnectionId, inTx?: (tx: DrizzleTx) => void): Promise<void> {
    this.runInTransaction((tx) => {
      tx.delete(connectionGrants).where(eq(connectionGrants.custody, id)).run();
      tx.delete(connections).where(eq(connections.id, id)).run();
      inTx?.(tx);
    });
  }

  writeEnsureGrant(exec: SqliteExec, custody: string, name: GrantName): void {
    exec
      .insert(connectionGrants)
      .values({ custody, name, state: "unauthorized" })
      .onConflictDoNothing({ target: [connectionGrants.custody, connectionGrants.name] })
      .run();
  }

  async ensureGrant(custody: string, name: GrantName): Promise<void> {
    this.writeEnsureGrant(this.db, custody, name);
  }

  async getGrant(custody: string, name: GrantName): Promise<GrantRecord | null> {
    const rows = await this.db
      .select()
      .from(connectionGrants)
      .where(and(eq(connectionGrants.custody, custody), eq(connectionGrants.name, name)));
    const row = rows[0];
    return row ? rowToGrant(row) : null;
  }

  async listGrants(custody: string): Promise<GrantRecord[]> {
    const rows = await this.db
      .select()
      .from(connectionGrants)
      .where(eq(connectionGrants.custody, custody));
    return rows.map(rowToGrant);
  }

  writeGrant(exec: SqliteExec, custody: string, name: GrantName, patch: GrantPatch): void {
    const set: Partial<typeof connectionGrants.$inferInsert> = {};
    if ("state" in patch) set.state = patch.state as string;
    if ("credential" in patch) set.credential = patch.credential ?? null;
    if ("profile" in patch) set.profile = patch.profile ?? null;
    if ("conferredAt" in patch) set.conferredAt = patch.conferredAt ?? null;
    if ("lastRenewedAt" in patch) set.lastRenewedAt = patch.lastRenewedAt ?? null;
    if ("degraded" in patch) {
      set.degradedAt = patch.degraded?.at ?? null;
      set.degradedReason = patch.degraded?.reason ?? null;
    }
    if (Object.keys(set).length === 0) return;
    exec
      .update(connectionGrants)
      .set(set)
      .where(and(eq(connectionGrants.custody, custody), eq(connectionGrants.name, name)))
      .run();
  }

  async updateGrant(custody: string, name: GrantName, patch: GrantPatch): Promise<void> {
    this.writeGrant(this.db, custody, name, patch);
  }
}

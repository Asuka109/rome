// Capability-to-grant-state signals. Messaging model: docs/concepts/messaging.md.
//
// `CredentialRejected` is the ONLY bridge from capabilities to grant state: any
// capability that gets "credential refused" from the service (401, invalid_auth,
// session logged out) surfaces this instead of a generic error. The runtime
// reacts by trying renew() once, then degrading the grant. Generic failures
// (timeouts, 500s, disconnects) must NOT use this — they're `Disconnected`,
// answered with backoff + rebuild, and never touch grant state.

import type { ConnectionId, GrantName } from "./types.js";

/** A Service that has more than one connection, with the offending connection
 *  IDs so an operator can resolve the duplicate explicitly. */
export interface DuplicateServiceConnectionGroup {
  service: string;
  connectionIds: ConnectionId[];
}

/**
 * The v1 connection model permits exactly one authority-bearing connection per
 * Service. IDs are included so an operator can resolve legacy duplicates
 * explicitly; the registry never selects, merges, or deletes one on its own.
 */
export class DuplicateServiceConnectionsError extends Error {
  readonly duplicates: readonly DuplicateServiceConnectionGroup[];

  constructor(duplicates: readonly DuplicateServiceConnectionGroup[]) {
    const detail = duplicates
      .map(({ service, connectionIds }) => `${service}: ${connectionIds.join(", ")}`)
      .join("; ");
    super(
      `Duplicate Service connections found (${detail}). Rome supports exactly one connection per Service; explicitly remove the unwanted connection before creating another.`,
    );
    this.name = "DuplicateServiceConnectionsError";
    this.duplicates = duplicates;
  }
}

/** Typed persistence-boundary translation of a `connections.service` unique
 *  constraint violation. The registry turns this into the operator-facing
 *  duplicate error after reading safe connection metadata. */
export class ServiceConnectionWriteConflict extends Error {
  readonly service: string;

  constructor(service: string, cause: unknown) {
    super(`Service "${service}" already has a connection`, { cause });
    this.name = "ServiceConnectionWriteConflict";
    this.service = service;
  }
}

/**
 * Signals a refused credential (use → auth). The optional `grant` pins which
 * grant was refused when a capability needs several; without it, the runtime
 * treats every grant the capability needs as suspect.
 */
export class CredentialRejected extends Error {
  readonly grant?: GrantName;

  constructor(opts?: { grant?: GrantName; cause?: unknown }) {
    super("credential rejected", opts?.cause !== undefined ? { cause: opts.cause } : undefined);
    this.name = "CredentialRejected";
    this.grant = opts?.grant;
  }
}

/**
 * Signals a terminal transport failure the builder could not recover. Never
 * touches grant state — the runtime answers with backoff + rebuild.
 */
export class Disconnected extends Error {
  constructor(cause?: unknown) {
    super("disconnected", cause !== undefined ? { cause } : undefined);
    this.name = "Disconnected";
  }
}

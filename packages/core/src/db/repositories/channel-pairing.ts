import { randomBytes, randomUUID } from "node:crypto";
import { and, desc, eq, gt, inArray, lte } from "drizzle-orm";
import { channelMappings, channelPairingRequests, persons } from "../schema.js";
import type { DrizzleDb } from "../index.js";

export const DEFAULT_PAIRING_TTL_MS = 15 * 60 * 1_000;

export type ChannelPairingRequest = typeof channelPairingRequests.$inferSelect;
export type PairingResolution =
  | { ok: true; status: "approved" | "rejected" }
  | {
      ok: false;
      reason:
        | "not_found"
        | "invalid_token"
        | "expired"
        | "already_resolved"
        | "guardian_missing"
        | "identity_conflict";
    };

/** Durable, single-use admission requests for unknown messaging identities. */
export class ChannelPairingRepository {
  private readonly ttlMs: number;

  constructor(
    private readonly db: DrizzleDb,
    options: { ttlMs?: number } = {},
  ) {
    this.ttlMs = options.ttlMs ?? DEFAULT_PAIRING_TTL_MS;
  }

  findOrCreate(
    channel: string,
    channelUserId: string,
    displayName: string | null,
    now = new Date(),
  ): ChannelPairingRequest {
    return this.db.transaction((tx) => {
      tx.update(channelPairingRequests)
        .set({ status: "expired", resolvedAt: now })
        .where(
          and(
            eq(channelPairingRequests.channel, channel),
            eq(channelPairingRequests.channelUserId, channelUserId),
            inArray(channelPairingRequests.status, ["pending", "rejected"]),
            lte(channelPairingRequests.expiresAt, now),
          ),
        )
        .run();

      const active = tx
        .select()
        .from(channelPairingRequests)
        .where(
          and(
            eq(channelPairingRequests.channel, channel),
            eq(channelPairingRequests.channelUserId, channelUserId),
            inArray(channelPairingRequests.status, ["pending", "rejected"]),
            gt(channelPairingRequests.expiresAt, now),
          ),
        )
        .orderBy(desc(channelPairingRequests.createdAt))
        .get();
      if (active) return active;

      const inserted = tx
        .insert(channelPairingRequests)
        .values({
          id: randomUUID(),
          channel,
          channelUserId,
          displayName,
          token: randomBytes(24).toString("base64url"),
          createdAt: now,
          expiresAt: new Date(now.getTime() + this.ttlMs),
        })
        .onConflictDoNothing()
        .returning()
        .get();
      if (inserted) return inserted;
      const winner = tx
        .select()
        .from(channelPairingRequests)
        .where(
          and(
            eq(channelPairingRequests.channel, channel),
            eq(channelPairingRequests.channelUserId, channelUserId),
            eq(channelPairingRequests.status, "pending"),
          ),
        )
        .get();
      if (!winner) throw new Error("Pairing request identity conflict");
      return winner;
    });
  }

  listPending(now = new Date()): ChannelPairingRequest[] {
    this.expire(now);
    return this.db
      .select()
      .from(channelPairingRequests)
      .where(eq(channelPairingRequests.status, "pending"))
      .orderBy(desc(channelPairingRequests.createdAt))
      .all();
  }

  get(id: string): ChannelPairingRequest | undefined {
    return this.db
      .select()
      .from(channelPairingRequests)
      .where(eq(channelPairingRequests.id, id))
      .get();
  }

  resolve(
    id: string,
    decision: "approve" | "reject",
    token: string | null,
    now = new Date(),
  ): PairingResolution {
    return this.db.transaction((tx): PairingResolution => {
      const request = tx
        .select()
        .from(channelPairingRequests)
        .where(eq(channelPairingRequests.id, id))
        .get();
      if (!request) return { ok: false, reason: "not_found" };
      if (token !== null && token !== request.token) return { ok: false, reason: "invalid_token" };
      if (request.status !== "pending") return { ok: false, reason: "already_resolved" };
      if (request.expiresAt <= now) {
        tx.update(channelPairingRequests)
          .set({ status: "expired", resolvedAt: now })
          .where(eq(channelPairingRequests.id, id))
          .run();
        return { ok: false, reason: "expired" };
      }

      if (decision === "approve") {
        const guardians = tx
          .select({ id: persons.id })
          .from(persons)
          .where(eq(persons.bondLevel, "guardian"))
          .all();
        if (guardians.length !== 1) return { ok: false, reason: "guardian_missing" };

        const held = tx
          .select({ personId: channelMappings.personId })
          .from(channelMappings)
          .where(
            and(
              eq(channelMappings.channel, request.channel),
              eq(channelMappings.channelUserId, request.channelUserId),
            ),
          )
          .get();
        if (held && held.personId !== guardians[0]!.id) {
          return { ok: false, reason: "identity_conflict" };
        }
        if (!held) {
          tx.insert(channelMappings)
            .values({
              id: randomUUID(),
              personId: guardians[0]!.id,
              channel: request.channel,
              channelUserId: request.channelUserId,
              displayName: request.displayName,
            })
            .run();
        }
      }

      const status = decision === "approve" ? "approved" : "rejected";
      tx.update(channelPairingRequests)
        .set({ status, resolvedAt: now })
        .where(and(eq(channelPairingRequests.id, id), eq(channelPairingRequests.status, "pending")))
        .run();
      return { ok: true, status };
    });
  }

  private expire(now: Date): void {
    this.db
      .update(channelPairingRequests)
      .set({ status: "expired", resolvedAt: now })
      .where(
        and(
          eq(channelPairingRequests.status, "pending"),
          lte(channelPairingRequests.expiresAt, now),
        ),
      )
      .run();
  }
}

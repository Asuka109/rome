import { afterEach, describe, expect, it } from "@rstest/core";
import { channelMappings, persons } from "../schema.js";
import { createTestDb, type TestDb } from "../../test/helpers.js";
import { ChannelPairingRepository } from "./channel-pairing.js";

describe("ChannelPairingRepository", () => {
  let testDb: TestDb | undefined;
  afterEach(() => testDb?.close());

  function setup() {
    testDb = createTestDb();
    testDb.db
      .insert(persons)
      .values({
        id: "guardian",
        displayName: "Guardian",
        bondLevel: "guardian",
        approved: true,
        createdAt: new Date(0),
      })
      .run();
    return new ChannelPairingRepository(testDb.db, { ttlMs: 60_000 });
  }

  it("reuses one active request for the same provider identity", () => {
    const repo = setup();
    const first = repo.findOrCreate("telegram", "42", "Ada", new Date(1_000));
    const second = repo.findOrCreate("telegram", "42", "Ada", new Date(2_000));
    expect(second.id).toBe(first.id);
    expect(repo.listPending(new Date(2_000))).toHaveLength(1);
  });

  it("expires old requests and mints a fresh request", () => {
    const repo = setup();
    const first = repo.findOrCreate("discord", "42", null, new Date(1_000));
    const second = repo.findOrCreate("discord", "42", null, new Date(62_000));
    expect(second.id).not.toBe(first.id);
    expect(repo.get(first.id)?.status).toBe("expired");
  });

  it("approves exactly once and maps the exact identity atomically", () => {
    const repo = setup();
    const request = repo.findOrCreate("feishu", "ou_42", "Ada", new Date(1_000));
    expect(repo.resolve(request.id, "approve", request.token, new Date(2_000))).toEqual({
      ok: true,
      status: "approved",
    });
    expect(repo.resolve(request.id, "approve", request.token, new Date(3_000))).toEqual({
      ok: false,
      reason: "already_resolved",
    });
    expect(testDb!.db.select().from(channelMappings).all()).toMatchObject([
      { channel: "feishu", channelUserId: "ou_42", personId: "guardian" },
    ]);
  });

  it("fails closed for a wrong token, expiry, and a competing mapping", () => {
    const repo = setup();
    const request = repo.findOrCreate("telegram", "42", "Ada", new Date(1_000));
    expect(repo.resolve(request.id, "approve", "wrong", new Date(2_000))).toEqual({
      ok: false,
      reason: "invalid_token",
    });
    expect(repo.resolve(request.id, "approve", request.token, new Date(62_000))).toEqual({
      ok: false,
      reason: "expired",
    });

    testDb!.db
      .insert(persons)
      .values({
        id: "ada",
        displayName: "Ada",
        bondLevel: "acquaintance",
        approved: true,
        createdAt: new Date(0),
      })
      .run();
    testDb!.db
      .insert(channelMappings)
      .values({
        id: "held",
        personId: "ada",
        channel: "discord",
        channelUserId: "99",
      })
      .run();
    const held = repo.findOrCreate("discord", "99", "Ada", new Date(3_000));
    expect(repo.resolve(held.id, "approve", held.token, new Date(4_000))).toEqual({
      ok: false,
      reason: "identity_conflict",
    });
    expect(repo.get(held.id)?.status).toBe("pending");
  });
});

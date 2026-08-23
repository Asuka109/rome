import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { Hono } from "hono";
import { personsRoutes } from "./persons.js";
import { createTestDb, buildTestDeps, type TestDb } from "../../test/helpers.js";
import { seedBaseline, type BaselineIds } from "../../test/seeds.js";
import { PersonMappingRepository } from "../../db/repositories/person-mapping.js";
import { STRANGER_PERSON_ID } from "../../constants.js";

// Note: POST /persons/create is not covered here — it writes to ~/.rome/<profile>/memory
// and is an orchestration step, not a pure DB route. The repo-level helpers it calls
// are already covered by src/db/repositories/person-mapping.test.ts.

describe("Persons API", () => {
  let testDb: TestDb;
  let app: Hono;
  let baseline: BaselineIds;

  beforeEach(async () => {
    testDb = createTestDb();
    baseline = await seedBaseline(testDb.db);
    const deps = await buildTestDeps(testDb.db);
    app = new Hono().route("/", personsRoutes(deps));
  });

  afterEach(() => testDb.close());

  describe("GET /persons", () => {
    it("returns baseline persons with channel mappings attached", async () => {
      const res = await app.request("/persons");
      expect(res.status).toBe(200);
      const rows = (await res.json()) as {
        id: string;
        displayName: string;
        channelMappings: { channel: string; channelUserId: string }[];
      }[];
      const ids = rows.map((r) => r.id);
      expect(ids).toEqual(
        expect.arrayContaining([
          baseline.persons.guardianId,
          baseline.persons.innerCircleId,
          baseline.persons.acquaintanceId,
          baseline.persons.otherId,
          baseline.persons.strangerId,
        ]),
      );
      const guardian = rows.find((r) => r.id === baseline.persons.guardianId)!;
      expect(guardian.channelMappings).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ channel: "telegram", channelUserId: "tg-guardian" }),
          expect.objectContaining({ channel: "webchat", channelUserId: "web-guardian" }),
        ]),
      );
    });
  });

  describe("GET /persons/unknown", () => {
    it("returns sentinel-log senders that have no channel mapping", async () => {
      const res = await app.request("/persons/unknown");
      expect(res.status).toBe(200);
      const rows = (await res.json()) as { channelUserId: string }[];
      const ids = rows.map((r) => r.channelUserId);
      // tg-alice is mapped (inner-circle), tg-stranger-999 is not.
      expect(ids).toContain("tg-stranger-999");
      expect(ids).not.toContain("tg-alice");
    });
  });

  describe("POST /persons/link", () => {
    it("requires channel, channelUserId, existingPersonId", async () => {
      const res = await app.request("/persons/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel: "telegram" }),
      });
      expect(res.status).toBe(400);
    });

    it("attaches a new channel mapping to an existing person", async () => {
      const res = await app.request("/persons/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel: "telegram",
          channelUserId: "tg-new-handle",
          existingPersonId: baseline.persons.guardianId,
          displayName: "Guardian Alt",
        }),
      });
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ success: true });

      const repo = new PersonMappingRepository(testDb.db);
      const guardian = await repo.findById(baseline.persons.guardianId);
      expect(guardian?.channelMappings).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ channel: "telegram", channelUserId: "tg-new-handle" }),
        ]),
      );
    });
  });

  describe("POST /persons/mark-stranger", () => {
    it("requires channel and channelUserId", async () => {
      const res = await app.request("/persons/mark-stranger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      expect(res.status).toBe(400);
    });

    it("records the mapping against the stranger person", async () => {
      const res = await app.request("/persons/mark-stranger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel: "telegram",
          channelUserId: "tg-spammer",
          displayName: "Spammer",
        }),
      });
      expect(res.status).toBe(200);
      const repo = new PersonMappingRepository(testDb.db);
      const stranger = await repo.findById(STRANGER_PERSON_ID);
      expect(stranger?.channelMappings).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ channel: "telegram", channelUserId: "tg-spammer" }),
        ]),
      );
    });
  });

  describe("POST /persons/link", () => {
    it("re-points an already-mapped identity instead of mapping it twice", async () => {
      const repo = new PersonMappingRepository(testDb.db);
      await app.request("/persons/mark-stranger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel: "telegram", channelUserId: "tg-spammer" }),
      });

      const res = await app.request("/persons/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel: "telegram",
          channelUserId: "tg-spammer",
          existingPersonId: baseline.persons.innerCircleId,
        }),
      });
      expect(res.status).toBe(200);

      const stranger = await repo.findById(STRANGER_PERSON_ID);
      expect(
        stranger?.channelMappings.filter((m) => m.channelUserId === "tg-spammer"),
      ).toHaveLength(0);
      const target = await repo.findById(baseline.persons.innerCircleId);
      expect(target?.channelMappings.filter((m) => m.channelUserId === "tg-spammer")).toHaveLength(
        1,
      );
    });
  });
});

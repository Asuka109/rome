import { afterEach, beforeEach, describe, expect, it } from "@rstest/core";
import { Hono } from "hono";
import { channelMappings, guardianAuth, persons } from "../../db/schema.js";
import { ChannelPairingRepository } from "../../db/repositories/channel-pairing.js";
import { COOKIE_NAME, createSession } from "../../lib/auth.js";
import { createTestDb, type TestDb } from "../../test/helpers.js";
import { pairingsCliRoutes } from "./pairings-cli.js";
import { pairingsRoutes } from "./pairings.js";

describe("pairing routes", () => {
  let testDb: TestDb;
  let repo: ChannelPairingRepository;
  const methods = { instanceOrigin: "https://rome.example", cliOrigin: "http://127.0.0.1:4141" };

  beforeEach(() => {
    testDb = createTestDb();
    repo = new ChannelPairingRepository(testDb.db);
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
    testDb.db
      .insert(guardianAuth)
      .values({
        id: "auth",
        userId: "guardian-user",
        passwordHash: "unused",
        onboardingComplete: true,
        createdAt: new Date(0),
      })
      .run();
  });
  afterEach(() => testDb.close());

  function app() {
    return new Hono().route(
      "/",
      pairingsRoutes({ db: testDb.db, pairingRepo: repo, pairingMethods: methods }),
    );
  }
  const guardianCookie = () => `${COOKIE_NAME}=${createSession("guardian-user")}`;

  it("requires the exact guardian session", async () => {
    expect((await app().request("/pairings")).status).toBe(401);
    expect(
      (
        await app().request("/pairings", {
          headers: { cookie: `${COOKIE_NAME}=${createSession("other")}` },
        })
      ).status,
    ).toBe(403);
    expect(
      (await app().request("/pairings", { headers: { cookie: guardianCookie() } })).status,
    ).toBe(200);
  });

  it("lists capability-derived methods and resolves a token once", async () => {
    const request = repo.findOrCreate("telegram", "42", "Ada");
    const listed = await app().request("/pairings", { headers: { cookie: guardianCookie() } });
    expect(await listed.json()).toMatchObject([
      {
        id: request.id,
        pairingUrl: `https://rome.example/pairing/${request.id}#token=${request.token}`,
        cli: { approve: expect.stringContaining("/_internal/pairings/") },
      },
    ]);
    const approve = await app().request(`/pairings/${request.id}/approve`, {
      method: "POST",
      headers: { cookie: guardianCookie(), "content-type": "application/json" },
      body: JSON.stringify({ token: request.token }),
    });
    expect(approve.status).toBe(200);
    const replay = await app().request(`/pairings/${request.id}/approve`, {
      method: "POST",
      headers: { cookie: guardianCookie(), "content-type": "application/json" },
      body: JSON.stringify({ token: request.token }),
    });
    expect(replay.status).toBe(409);
    expect(testDb.db.select().from(channelMappings).all()).toHaveLength(1);
  });

  it("fails closed for a wrong token", async () => {
    const request = repo.findOrCreate("discord", "42", null);
    const response = await app().request(`/pairings/${request.id}/approve`, {
      method: "POST",
      headers: { cookie: guardianCookie(), "content-type": "application/json" },
      body: JSON.stringify({ token: "wrong" }),
    });
    expect(response.status).toBe(403);
    expect(repo.get(request.id)?.status).toBe("pending");
  });

  it("exposes the fallback only on a loopback listener", async () => {
    expect(() =>
      pairingsCliRoutes({ pairingRepo: repo, pairingMethods: methods }, "0.0.0.0"),
    ).toThrow("loopback");
    const request = repo.findOrCreate("feishu", "ou_42", null);
    const cli = pairingsCliRoutes({ pairingRepo: repo, pairingMethods: methods }, "127.0.0.1");
    expect((await cli.request("/_internal/pairings")).status).toBe(200);
    expect(
      (await cli.request(`/_internal/pairings/${request.id}/reject`, { method: "POST" })).status,
    ).toBe(200);
    expect(repo.get(request.id)?.status).toBe("rejected");
  });
});

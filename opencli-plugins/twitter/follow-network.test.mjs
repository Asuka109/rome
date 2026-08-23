import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ArgumentError, AuthRequiredError } from "@jackwener/opencli/errors";
import { getRegistry } from "@jackwener/opencli/registry";
import "./follow-network.js";
import {
  followVisibleNetworkUsers,
  normalizeFollowNetworkLimit,
  normalizeNetworkBatch,
  normalizeNetworkSource,
  normalizeTwitterUsername,
  twitterNetworkUrl,
} from "./twitter-network-helpers.mjs";

describe("twitter follow-network helpers", () => {
  it("normalizes handles, sources, limits, and network URLs", () => {
    assert.equal(normalizeTwitterUsername(" @realYunfanYe "), "realYunfanYe");
    assert.equal(normalizeNetworkSource(" FOLLOWING "), "following");
    assert.equal(normalizeFollowNetworkLimit(undefined), 50);
    assert.equal(normalizeFollowNetworkLimit("12"), 12);
    assert.equal(
      twitterNetworkUrl("realYunfanYe", "followers"),
      "https://x.com/realYunfanYe/followers",
    );
  });

  it("rejects malformed arguments", () => {
    assert.throws(() => normalizeTwitterUsername("not/a/user"), ArgumentError);
    assert.throws(() => normalizeTwitterUsername("x".repeat(16)), ArgumentError);
    assert.throws(() => normalizeNetworkSource("likes"), ArgumentError);
    assert.throws(() => normalizeFollowNetworkLimit(0), ArgumentError);
    assert.throws(() => normalizeFollowNetworkLimit(501), ArgumentError);
  });

  it("unwraps Browser Bridge envelopes and normalizes extracted rows", () => {
    assert.deepEqual(
      normalizeNetworkBatch({
        session: "session-1",
        data: {
          ok: true,
          has_cells: true,
          container_found: true,
          route_matches: true,
          observed: [{ username: "alice", name: "Alice" }],
          followed: [{ username: "alice", name: "Alice" }],
        },
      }),
      {
        container_found: true,
        has_cells: true,
        observed: [{ username: "alice", name: "Alice" }],
        route_matches: true,
        followed: [{ username: "alice", name: "Alice" }],
      },
    );
  });

  it("scopes candidates to the requested network region and ignores sidebar UserCells", async () => {
    let sidebarClicks = 0;
    const avatar = (username) => ({
      getAttribute: () => `UserAvatar-Container-${username}`,
    });
    const networkUnfollowButton = { innerText: "Following", textContent: "Following" };
    const networkCell = {
      innerText: "Network User\n@network_user\nFollowing",
      querySelector: (selector) => {
        if (selector === '[data-testid^="UserAvatar-Container-"]') return avatar("network_user");
        if (selector === '[data-testid$="-unfollow"]') return networkUnfollowButton;
        return null;
      },
      querySelectorAll: () => [networkUnfollowButton],
    };
    const sidebarFollowButton = {
      disabled: false,
      innerText: "Follow",
      textContent: "Follow",
      getAttribute: () => null,
      click: () => sidebarClicks++,
    };
    const sidebarCell = {
      innerText: "Sidebar User\n@sidebar_user\nFollow",
      querySelector: (selector) => {
        if (selector === '[data-testid^="UserAvatar-Container-"]') return avatar("sidebar_user");
        if (selector === '[data-testid$="-follow"]') return sidebarFollowButton;
        return null;
      },
      querySelectorAll: () => [sidebarFollowButton],
    };
    const networkRegion = {
      querySelectorAll: () => [networkCell],
    };
    const primaryColumn = {
      querySelector: (selector) => (selector === 'section[role="region"]' ? networkRegion : null),
    };
    const previousDocument = globalThis.document;
    const previousWindow = globalThis.window;
    globalThis.document = {
      querySelector: (selector) =>
        selector === '[data-testid="primaryColumn"]' ? primaryColumn : null,
      querySelectorAll: () => [networkCell, sidebarCell],
    };
    globalThis.window = { location: { pathname: "/realYunfanYe/followers" } };

    try {
      const result = await followVisibleNetworkUsers([], 1, "realYunfanYe", "followers");
      assert.deepEqual(result.observed, [{ username: "network_user", name: "Network User" }]);
      assert.deepEqual(result.followed, []);
      assert.equal(result.container_found, true);
      assert.equal(result.route_matches, true);
      assert.equal(sidebarClicks, 0);
    } finally {
      globalThis.document = previousDocument;
      globalThis.window = previousWindow;
    }
  });
});

describe("twitter follow-network command", () => {
  it("registers as a browser-backed write command", () => {
    const command = getRegistry().get("twitter/follow-network");
    assert.equal(typeof command?.func, "function");
    assert.equal(command?.access, "write");
    assert.equal(command?.browser, true);
    assert.deepEqual(command?.columns, ["username", "name", "source", "status", "message"]);
    assert.deepEqual(command?.args.find((arg) => arg.name === "source")?.choices, [
      "followers",
      "following",
    ]);
  });

  it("clicks users from the network page without opening their profiles", async () => {
    const command = getRegistry().get("twitter/follow-network");
    const calls = { goto: [], wait: [], evaluate: [] };
    const page = {
      getCookies: async () => [{ name: "ct0", value: "token" }],
      goto: async (url) => calls.goto.push(url),
      wait: async (value) => calls.wait.push(value),
      autoScroll: async () => assert.fail("limit should be reached before scrolling"),
      evaluate: async (...args) => {
        calls.evaluate.push(args);
        return {
          ok: true,
          has_cells: true,
          container_found: true,
          route_matches: true,
          observed: [{ username: "alice", name: "Alice" }],
          followed: [{ username: "alice", name: "Alice" }],
        };
      },
    };

    const rows = await command.func(page, {
      user: "@realYunfanYe",
      source: "followers",
      limit: 1,
    });

    assert.deepEqual(calls.goto, ["https://x.com/realYunfanYe/followers"]);
    assert.equal(calls.evaluate.length, 1);
    assert.equal(typeof calls.evaluate[0][0], "function");
    assert.deepEqual(rows, [
      {
        username: "alice",
        name: "Alice",
        source: "followers",
        status: "success",
        message: "Successfully followed @alice from @realYunfanYe's followers.",
      },
    ]);
  });

  it("checks typed input before browser auth and fails typed when signed out", async () => {
    const command = getRegistry().get("twitter/follow-network");
    let cookieReads = 0;
    const signedOutPage = {
      getCookies: async () => {
        cookieReads++;
        return [];
      },
    };

    await assert.rejects(
      command.func(signedOutPage, { user: "not/a/user", source: "followers", limit: 1 }),
      ArgumentError,
    );
    assert.equal(cookieReads, 0);
    await assert.rejects(
      command.func(signedOutPage, { user: "realYunfanYe", source: "followers", limit: 1 }),
      AuthRequiredError,
    );
    assert.equal(cookieReads, 1);
  });
});

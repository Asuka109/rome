import { describe, it, expect } from "vitest";
import { createSessionHandoffKey, SESSION_HANDOFF_KEY_PREFIX } from "./session-handoff.js";

describe("createSessionHandoffKey", () => {
  it("prefixes the nonce with the shared key prefix", () => {
    expect(createSessionHandoffKey("abc")).toBe(`${SESSION_HANDOFF_KEY_PREFIX}abc`);
  });
});

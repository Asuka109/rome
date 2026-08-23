import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createTestDb, type TestDb } from "../../test/helpers.js";
import { SettingsRepository } from "./settings.js";

describe("SettingsRepository", () => {
  let testDb: TestDb;
  let repo: SettingsRepository;

  beforeEach(() => {
    testDb = createTestDb();
    repo = new SettingsRepository(testDb.db);
  });

  afterEach(() => {
    testDb.close();
  });

  it("get() returns parsed JSON value for key", async () => {
    await repo.set("greeting", "Hello, world!");
    const value = await repo.get<string>("greeting");
    expect(value).toBe("Hello, world!");
  });

  it("get() returns null for missing key", async () => {
    const value = await repo.get("nonexistent");
    expect(value).toBeNull();
  });

  it("set() inserts new key-value pair", async () => {
    await repo.set("theme", { mode: "dark", fontSize: 14 });
    const value = await repo.get<{ mode: string; fontSize: number }>("theme");
    expect(value).toEqual({ mode: "dark", fontSize: 14 });
  });

  it("set() updates existing key-value pair", async () => {
    await repo.set("counter", 1);
    await repo.set("counter", 2);
    const value = await repo.get<number>("counter");
    expect(value).toBe(2);
  });

  it("getAll() returns all settings as object", async () => {
    await repo.set("key1", "value1");
    await repo.set("key2", { nested: true });
    await repo.set("key3", 42);

    const all = await repo.getAll();
    expect(all).toEqual({
      key1: "value1",
      key2: { nested: true },
      key3: 42,
    });
  });
});

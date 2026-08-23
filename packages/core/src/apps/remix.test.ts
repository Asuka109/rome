import { createHash } from "node:crypto";
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AppCatalog } from "./catalog.js";
import type { AppManager } from "./manager.js";
import { packBundle } from "./packaging/index.js";
import { remixInstalledApp } from "./remix.js";

const tempRoots: string[] = [];

async function tempRoot(label: string): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), label));
  tempRoots.push(root);
  return root;
}

afterEach(async () => {
  await Promise.all(tempRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

async function fixture(includeSource = true) {
  const root = await tempRoot("rome-remix-test-");
  const bundleRoot = join(root, "bundle", "calendar");
  const installedRoot = join(root, "installed");
  const authoringRoot = join(root, "authoring");
  const installedBundleRoot = join(installedRoot, "calendar", "installed-hash");
  await mkdir(join(bundleRoot, "custom-source"), { recursive: true });
  await mkdir(installedBundleRoot, { recursive: true });
  const manifest = [
    "formatVersion: 1",
    "id: calendar",
    "name: Calendar",
    "version: 1.2.3",
    "description: Calendar",
    `includeSource: ${includeSource}`,
    "agents: []",
    "actions: []",
    "skills: []",
    "hooks: []",
    "",
  ].join("\n");
  await writeFile(join(bundleRoot, "app.yaml"), manifest);
  await writeFile(join(bundleRoot, "custom-source", "main.txt"), "complete root\n");
  await writeFile(join(bundleRoot, ".rome-artifact.json"), "{}\n");
  await writeFile(join(installedBundleRoot, "app.yaml"), manifest);
  await symlink("installed-hash", join(installedRoot, "calendar", "active"));
  const bytes = await packBundle(bundleRoot);
  const hash = createHash("sha256").update(bytes).digest("hex");
  const entry = {
    source: {
      mode: "appstore" as const,
      listingId: "@alice/calendar",
      version: "1.2.3",
      contentHash: hash,
    },
    enabled: true,
    firstParty: false,
    state: "installed" as const,
    installedHash: hash,
    installedVersion: "1.2.3",
    lastError: null,
    updatedAt: new Date(0).toISOString(),
  };
  const appManager = {
    readLockfileEntry: vi.fn(async (appId: string) => (appId === "calendar" ? entry : null)),
  } as unknown as AppManager;
  const appCatalog = { get: vi.fn(() => null) } as unknown as AppCatalog;
  const bundleFetcher = vi.fn(async () => bytes);
  return {
    root,
    bundleRoot,
    installedRoot,
    authoringRoot,
    entry,
    appManager,
    appCatalog,
    bundleFetcher,
  };
}

async function replaceBundle(f: Awaited<ReturnType<typeof fixture>>, bytes: Buffer): Promise<void> {
  const hash = createHash("sha256").update(bytes).digest("hex");
  f.entry.source.contentHash = hash;
  f.entry.installedHash = hash;
  f.bundleFetcher.mockImplementation(async () => bytes);
}

describe("remixInstalledApp", () => {
  it("copies the complete bundle root without assuming src and rewrites only remix identity", async () => {
    const f = await fixture();

    const result = await remixInstalledApp(
      {
        appId: "ray-calendar",
        name: "@ray/calendar",
        from: { appId: "calendar" },
      },
      f,
    );

    expect(result).toEqual({
      appId: "ray-calendar",
      created: true,
      rootPath: join(f.authoringRoot, "ray-calendar"),
    });
    expect(await readFile(join(result.rootPath, "custom-source", "main.txt"), "utf-8")).toBe(
      "complete root\n",
    );
    await expect(readFile(join(result.rootPath, ".rome-artifact.json"), "utf-8")).rejects.toThrow();
    const manifest = parseYaml(await readFile(join(result.rootPath, "app.yaml"), "utf-8"));
    expect(manifest).toMatchObject({
      id: "ray-calendar",
      name: "@ray/calendar",
      version: "1.2.3",
      includeSource: true,
      remix: { listing: "@alice/calendar", version: "1.2.3" },
    });
    expect(parseYaml(await readFile(join(f.bundleRoot, "app.yaml"), "utf-8"))).toMatchObject({
      id: "calendar",
      name: "Calendar",
    });
    expect(f.bundleFetcher).toHaveBeenCalledWith({
      mode: "appstore",
      listingId: "@alice/calendar",
      version: "1.2.3",
      contentHash: f.entry.source.contentHash,
    });
  });

  it("isolates declared action, agent, skill, and database identities from the source app", async () => {
    const f = await fixture();
    const manifest = [
      "formatVersion: 1",
      "id: calendar",
      "name: Calendar",
      "version: 1.2.3",
      "description: Calendar",
      "includeSource: true",
      "actions:",
      "  - path: actions/calendar-lookup",
      "    publicName: calendar_lookup",
      "    aliases: [calendar_lookup_legacy]",
      "agents:",
      "  - path: agents/calendar-agent.yaml",
      "    publicName: calendar_agent",
      "    aliases: [calendar_agent_legacy]",
      "skills:",
      "  - path: skills/calendar-help",
      "    publicName: calendar_help",
      "    aliases: [calendar_help_legacy]",
      "hooks: []",
      "suggestedChannelBindings:",
      "  - channel: webchat",
      "    agent: calendar_agent",
      "db:",
      "  migrations: db/migrations",
      "  tablePrefix: calendar",
      "",
    ].join("\n");
    await mkdir(join(f.bundleRoot, "actions", "calendar-lookup"), { recursive: true });
    await mkdir(join(f.bundleRoot, "agents"), { recursive: true });
    await mkdir(join(f.bundleRoot, "skills", "calendar-help"), { recursive: true });
    await mkdir(join(f.bundleRoot, "src", "actions", "calendar-lookup"), { recursive: true });
    await mkdir(join(f.bundleRoot, "src", "agents"), { recursive: true });
    await mkdir(join(f.bundleRoot, "src", "skills", "calendar-help"), { recursive: true });
    await mkdir(join(f.bundleRoot, "db", "migrations", "meta"), { recursive: true });
    await writeFile(join(f.bundleRoot, "app.yaml"), manifest);
    await writeFile(join(f.installedRoot, "calendar", "installed-hash", "app.yaml"), manifest);
    const actionConfig = [
      "name: calendar_lookup",
      "type: custom",
      "description: Look up a calendar entry",
      "complexity: simple",
      "speed: fast",
      "reliability: high",
      "sideEffects: read-only",
      "",
    ].join("\n");
    const agentConfig = [
      "name: calendar_agent",
      "description: Calendar agent",
      "tier: small",
      "systemPromptPrefix: Help with the calendar.",
      "tools: [calendar_lookup]",
      "actions: [calendar_lookup]",
      "permissionMode: default",
      "allowedSubagents: [calendar_agent]",
      "",
    ].join("\n");
    const skillConfig = [
      "---",
      "name: calendar_help",
      "description: Help with calendars",
      "tools: [Read]",
      "---",
      "",
      "# Calendar Help",
      "",
    ].join("\n");
    await writeFile(join(f.bundleRoot, "actions", "calendar-lookup", "action.yaml"), actionConfig);
    await writeFile(join(f.bundleRoot, "agents", "calendar-agent.yaml"), agentConfig);
    await writeFile(join(f.bundleRoot, "skills", "calendar-help", "SKILL.md"), skillConfig);
    await writeFile(
      join(f.bundleRoot, "src", "actions", "calendar-lookup", "action.yaml"),
      actionConfig,
    );
    await writeFile(join(f.bundleRoot, "src", "agents", "calendar-agent.yaml"), agentConfig);
    await writeFile(join(f.bundleRoot, "src", "skills", "calendar-help", "SKILL.md"), skillConfig);
    await writeFile(
      join(f.bundleRoot, "db", "migrations", "0000_init.sql"),
      "CREATE TABLE `calendar__events` (`id` text PRIMARY KEY);\n",
    );
    await writeFile(join(f.bundleRoot, "db", "migrations", "meta", "_journal.json"), "{}\n");
    await replaceBundle(f, await packBundle(f.bundleRoot));

    const result = await remixInstalledApp(
      {
        appId: "ray-calendar",
        name: "@ray/calendar",
        from: { appId: "calendar" },
      },
      f,
    );

    expect(parseYaml(await readFile(join(result.rootPath, "app.yaml"), "utf-8"))).toMatchObject({
      id: "ray-calendar",
      actions: [
        {
          path: "actions/calendar-lookup",
          publicName: "ray_calendar__calendar_lookup",
          aliases: ["ray_calendar__calendar_lookup_legacy"],
        },
      ],
      agents: [
        {
          path: "agents/calendar-agent.yaml",
          publicName: "ray_calendar__calendar_agent",
          aliases: ["ray_calendar__calendar_agent_legacy"],
        },
      ],
      skills: [
        {
          path: "skills/calendar-help",
          publicName: "ray_calendar__calendar_help",
          aliases: ["ray_calendar__calendar_help_legacy"],
        },
      ],
      suggestedChannelBindings: [{ channel: "webchat", agent: "ray_calendar__calendar_agent" }],
      db: { migrations: "db/migrations", tablePrefix: "ray_calendar" },
    });
    expect(
      parseYaml(
        await readFile(join(result.rootPath, "actions", "calendar-lookup", "action.yaml"), "utf-8"),
      ),
    ).toMatchObject({ name: "ray_calendar__calendar_lookup" });
    expect(
      parseYaml(await readFile(join(result.rootPath, "agents", "calendar-agent.yaml"), "utf-8")),
    ).toMatchObject({
      name: "ray_calendar__calendar_agent",
      tools: ["ray_calendar__calendar_lookup"],
      actions: ["ray_calendar__calendar_lookup"],
      allowedSubagents: ["ray_calendar__calendar_agent"],
    });
    expect(
      await readFile(join(result.rootPath, "skills", "calendar-help", "SKILL.md"), "utf-8"),
    ).toMatch(/^---\nname: ray_calendar__calendar_help\n/mu);
    expect(
      parseYaml(
        await readFile(
          join(result.rootPath, "src", "actions", "calendar-lookup", "action.yaml"),
          "utf-8",
        ),
      ),
    ).toMatchObject({ name: "ray_calendar__calendar_lookup" });
    expect(
      parseYaml(
        await readFile(join(result.rootPath, "src", "agents", "calendar-agent.yaml"), "utf-8"),
      ),
    ).toMatchObject({
      name: "ray_calendar__calendar_agent",
      tools: ["ray_calendar__calendar_lookup"],
    });
    expect(
      await readFile(join(result.rootPath, "src", "skills", "calendar-help", "SKILL.md"), "utf-8"),
    ).toMatch(/^---\nname: ray_calendar__calendar_help\n/mu);
    expect(
      parseYaml(
        await readFile(join(f.bundleRoot, "actions", "calendar-lookup", "action.yaml"), "utf-8"),
      ),
    ).toMatchObject({ name: "calendar_lookup" });
    expect(
      await readFile(join(f.bundleRoot, "skills", "calendar-help", "SKILL.md"), "utf-8"),
    ).toMatch(/^---\nname: calendar_help\n/mu);
  });

  it("uses only the local installed manifest to grant remixability", async () => {
    const f = await fixture(false);

    await expect(
      remixInstalledApp(
        {
          appId: "ray-calendar",
          name: "@ray/calendar",
          from: { appId: "calendar" },
        },
        f,
      ),
    ).rejects.toThrow(/does not enable includeSource/);
    expect(f.bundleFetcher).not.toHaveBeenCalled();
  });

  it("refuses an existing destination without changing it", async () => {
    const f = await fixture();
    const destination = join(f.authoringRoot, "ray-calendar");
    await mkdir(destination, { recursive: true });
    await writeFile(join(destination, "keep.txt"), "mine\n");

    await expect(
      remixInstalledApp(
        {
          appId: "ray-calendar",
          name: "@ray/calendar",
          from: { appId: "calendar" },
        },
        f,
      ),
    ).rejects.toThrow(/already exists/);
    expect(await readFile(join(destination, "keep.txt"), "utf-8")).toBe("mine\n");
  });

  it("refuses to reuse the source app id", async () => {
    const f = await fixture();
    await expect(
      remixInstalledApp(
        { appId: "calendar", name: "@ray/calendar", from: { appId: "calendar" } },
        f,
      ),
    ).rejects.toThrow(/must use a new app id/);
  });

  it("requires the local id to be the scoped name with a filesystem-safe prefix", async () => {
    const f = await fixture();

    await expect(
      remixInstalledApp(
        { appId: "calendar-copy", name: "@ray/calendar", from: { appId: "calendar" } },
        f,
      ),
    ).rejects.toThrow(/must be "ray-calendar"/);
    await expect(
      remixInstalledApp(
        { appId: "ray-calendar", name: "Calendar Copy", from: { appId: "calendar" } },
        f,
      ),
    ).rejects.toThrow(/must be scoped/);
  });

  it("rejects bundle bytes that do not match the installed content hash", async () => {
    const f = await fixture();
    f.bundleFetcher.mockImplementation(async () => Buffer.from("tampered"));

    await expect(
      remixInstalledApp(
        { appId: "ray-calendar", name: "@ray/calendar", from: { appId: "calendar" } },
        f,
      ),
    ).rejects.toThrow(/hash mismatch/);
    await expect(readFile(join(f.authoringRoot, "ray-calendar", "app.yaml"))).rejects.toThrow();
  });

  it("rejects a downloaded bundle whose manifest is not the installed app version", async () => {
    const f = await fixture();
    const manifestPath = join(f.bundleRoot, "app.yaml");
    const manifest = (await readFile(manifestPath, "utf-8")).replace(
      "version: 1.2.3",
      "version: 9.9.9",
    );
    await writeFile(manifestPath, manifest);
    await replaceBundle(f, await packBundle(f.bundleRoot));

    await expect(
      remixInstalledApp(
        { appId: "ray-calendar", name: "@ray/calendar", from: { appId: "calendar" } },
        f,
      ),
    ).rejects.toThrow(/identity does not match/);
  });

  it("rejects symbolic links in the published bundle root", async () => {
    const f = await fixture();
    await symlink("custom-source/main.txt", join(f.bundleRoot, "source-link"));
    await replaceBundle(f, await packBundle(f.bundleRoot));

    await expect(
      remixInstalledApp(
        { appId: "ray-calendar", name: "@ray/calendar", from: { appId: "calendar" } },
        f,
      ),
    ).rejects.toThrow(/unsupported SymbolicLink entry/);
  });
});

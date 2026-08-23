/**
 * One-shot migration from per-app `deployment.yaml` + version-keyed bundle
 * dirs to the imperative lockfile + content-addressed bundle layout.
 *
 * Triggered automatically on the first boot that finds a legacy layout. The
 * migrator never runs twice on the same profile — if either `apps.lock.json`
 * or `apps/installed/` already exists, it bails.
 */
import { existsSync } from "node:fs";
import { mkdir, readdir, readFile, rename, rm, symlink, unlink } from "node:fs/promises";
import { join } from "node:path";
import { createLogger } from "../logger.js";
import { hashWorkspace } from "./packaging/index.js";
import {
  APPS_LOCKFILE_SCHEMA_VERSION,
  type AppEntry,
  type AppLockfile,
  type SpecSource,
  writeLockfile,
  nowIso,
} from "./lockfile.js";

const log = createLogger("apps-migrate-to-lockfile");

export interface MigrateOptions {
  /** `~/.rome/<profile>` */
  profileRoot: string;
  /** Override for the legacy `<profile>/apps` dir. */
  legacyAppsDir?: string;
  /** Override for the new `<profile>/apps/installed` dir. */
  installedDir?: string;
  /** Override for the new `<profile>/apps.lock.json` path. */
  lockfilePath?: string;
}

export interface MigrateResult {
  skipped: boolean;
  reason?: string;
  migrated: number;
  failures: Array<{ appId: string; error: string }>;
}

export async function migrateToLockfile(opts: MigrateOptions): Promise<MigrateResult> {
  const legacyAppsDir = opts.legacyAppsDir ?? join(opts.profileRoot, "apps");
  const installedDir = opts.installedDir ?? join(legacyAppsDir, "installed");
  const lockfilePath = opts.lockfilePath ?? join(opts.profileRoot, "apps.lock.json");

  if (existsSync(lockfilePath)) {
    return { skipped: true, reason: "apps.lock.json already exists", migrated: 0, failures: [] };
  }
  if (existsSync(installedDir)) {
    return { skipped: true, reason: "apps/installed already exists", migrated: 0, failures: [] };
  }
  if (!existsSync(legacyAppsDir)) {
    return { skipped: true, reason: "no legacy apps dir", migrated: 0, failures: [] };
  }

  await mkdir(installedDir, { recursive: true });

  const entries: Record<string, AppEntry> = {};
  const failures: Array<{ appId: string; error: string }> = [];

  let appDirs: string[];
  try {
    appDirs = await readdir(legacyAppsDir);
  } catch (err) {
    return {
      skipped: true,
      reason: `cannot read legacy apps dir: ${(err as Error).message}`,
      migrated: 0,
      failures: [],
    };
  }

  for (const appId of appDirs) {
    if (appId === "installed" || appId === "data" || appId.startsWith(".")) continue;
    const appDir = join(legacyAppsDir, appId);
    const yamlPath = join(appDir, "deployment.yaml");
    if (!existsSync(yamlPath)) {
      log.warn("dir without deployment.yaml, skipping", { appDir });
      continue;
    }

    const record = await loadLegacyDeployment(yamlPath).catch((err) => {
      entries[appId] = brokenEntry(appId, "MIGRATE_PARSE", (err as Error).message);
      failures.push({ appId, error: (err as Error).message });
      return null;
    });
    if (record == null) continue;

    const source = record.source;
    const enabled = record.enabled;
    const oldVersion = record.installedVersion;
    const oldPhase = record.phase;

    if (oldPhase !== "Ready" || !oldVersion) {
      entries[appId] = {
        source,
        enabled,
        firstParty: false,
        state: "failed",
        installedHash: null,
        installedVersion: null,
        lastError: record.lastError,
        updatedAt: nowIso(),
      };
      continue;
    }

    const versionDir = join(appDir, oldVersion);
    if (!existsSync(versionDir)) {
      entries[appId] = {
        source,
        enabled,
        firstParty: false,
        state: "broken",
        installedHash: null,
        installedVersion: oldVersion,
        lastError: { code: "MIGRATE_MISSING_BUNDLE", message: `expected ${versionDir}` },
        updatedAt: nowIso(),
      };
      failures.push({ appId, error: "missing bundle dir" });
      continue;
    }

    try {
      const hash = await hashWorkspace(versionDir);
      const newAppDir = join(installedDir, appId);
      const newHashDir = join(newAppDir, hash);
      await mkdir(newAppDir, { recursive: true });

      if (existsSync(newHashDir)) {
        await rm(versionDir, { recursive: true, force: true });
      } else {
        await rename(versionDir, newHashDir);
      }

      const activePath = join(newAppDir, "active");
      const tmpActive = join(newAppDir, `.active.tmp.${process.pid}.${Date.now()}`);
      await unlink(tmpActive).catch(() => {});
      await symlink(hash, tmpActive);
      await rename(tmpActive, activePath);

      entries[appId] = {
        source,
        enabled,
        firstParty: false,
        state: "installed",
        installedHash: hash,
        installedVersion: oldVersion,
        lastError: null,
        updatedAt: nowIso(),
      };
    } catch (err) {
      entries[appId] = {
        source,
        enabled,
        firstParty: false,
        state: "broken",
        installedHash: null,
        installedVersion: oldVersion,
        lastError: { code: "MIGRATE_RELOCATE", message: (err as Error).message },
        updatedAt: nowIso(),
      };
      failures.push({ appId, error: (err as Error).message });
    }
  }

  const lockfile: AppLockfile = { schemaVersion: APPS_LOCKFILE_SCHEMA_VERSION, apps: entries };
  await writeLockfile(lockfilePath, lockfile);

  for (const appId of Object.keys(entries)) {
    const yamlPath = join(legacyAppsDir, appId, "deployment.yaml");
    if (existsSync(yamlPath)) {
      await rm(yamlPath).catch(() => undefined);
    }
    const appDir = join(legacyAppsDir, appId);
    try {
      const remaining = await readdir(appDir);
      if (remaining.length === 0) await rm(appDir, { recursive: true });
    } catch {
      // best-effort
    }
  }

  log.info("migration complete", {
    migrated: Object.keys(entries).length,
    failures: failures.length,
  });

  return { skipped: false, migrated: Object.keys(entries).length, failures };
}

interface LegacyDeploymentSummary {
  source: SpecSource;
  enabled: boolean;
  phase: string;
  installedVersion: string | null;
  lastError: { code: string; message: string } | null;
}

async function loadLegacyDeployment(yamlPath: string): Promise<LegacyDeploymentSummary> {
  const raw = await readFile(yamlPath, "utf-8");
  const { parse } = await import("yaml");
  const parsed = parse(raw);
  if (parsed == null || typeof parsed !== "object") {
    throw new Error("empty or non-object deployment.yaml");
  }
  const obj = parsed as Record<string, unknown>;
  const spec = (obj.spec ?? {}) as Record<string, unknown>;
  const status = (obj.status ?? {}) as Record<string, unknown>;
  const rawSource = (spec.source ?? {}) as Record<string, unknown>;
  let source: SpecSource;
  if (rawSource.mode === "workspace" && typeof rawSource.path === "string") {
    source = { mode: "bundle", path: rawSource.path };
  } else if (
    rawSource.mode === "appstore" &&
    typeof rawSource.version === "string" &&
    typeof rawSource.url === "string"
  ) {
    // Legacy appstore source carries a url; the new schema uses listingId.
    source = {
      mode: "appstore",
      listingId: rawSource.url,
      version: rawSource.version,
      contentHash: typeof status.integrity === "string" ? status.integrity : "0".repeat(64),
    };
  } else {
    throw new Error(`unrecognized spec.source shape: ${JSON.stringify(rawSource)}`);
  }
  const enabled = spec.enabled !== false;
  const phase = typeof status.phase === "string" ? status.phase : "Pending";
  const installedVersion =
    typeof status.installedVersion === "string" ? status.installedVersion : null;
  const lastErrorRaw = status.lastError as Record<string, unknown> | null | undefined;
  const lastError =
    lastErrorRaw != null && typeof lastErrorRaw.message === "string"
      ? { code: "MIGRATE_LEGACY_FAILURE", message: String(lastErrorRaw.message) }
      : null;
  return { source, enabled, phase, installedVersion, lastError };
}

function brokenEntry(appId: string, code: string, message: string): AppEntry {
  return {
    source: { mode: "bundle", path: "<UNKNOWN>" },
    enabled: false,
    firstParty: false,
    state: "broken",
    installedHash: null,
    installedVersion: null,
    lastError: { code, message },
    updatedAt: nowIso(),
  };
}

import "dotenv/config";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { defineConfig } from "drizzle-kit";
import { parse as parseYaml } from "yaml";
import { resolveAuthoringAppRoot } from "./src/apps/authoring.js";

function requireAppId(): string {
  const appId = process.env.ROME_APP_ID?.trim();
  if (!appId) {
    throw new Error("ROME_APP_ID is required for drizzle.authoring.config.ts");
  }
  return appId;
}

function resolveTablePrefix(appRoot: string, appId: string): string {
  const manifestPath = join(appRoot, "app.yaml");
  const raw = readFileSync(manifestPath, "utf-8");
  const parsed = parseYaml(raw) as { db?: { tablePrefix?: unknown } } | null;
  const tablePrefix = parsed?.db?.tablePrefix;
  return typeof tablePrefix === "string" && tablePrefix.length > 0 ? tablePrefix : appId;
}

const appId = requireAppId();
const { rootPath: appRoot } = resolveAuthoringAppRoot(appId, { preferCustom: true });
const schemaPath = join(appRoot, "db", "schema.ts");
const migrationsPath = join(appRoot, "db", "migrations");
const tablePrefix = resolveTablePrefix(appRoot, appId);

if (!existsSync(schemaPath)) {
  throw new Error(`App "${appId}" is missing DB schema at ${schemaPath}`);
}

export default defineConfig({
  schema: schemaPath,
  out: migrationsPath,
  dialect: "sqlite",
  migrations: { table: `__drizzle_migrations_app_${tablePrefix}` },
  tablesFilter: [`${tablePrefix}__*`],
  dbCredentials: {
    url:
      process.env.SQLITE_PATH ??
      join(homedir(), ".rome", process.env.ROME_PROFILE || "default", "rome.db"),
  },
});

import { join } from "path";
import { migrate as migrateSqlite } from "drizzle-orm/better-sqlite3/migrator";
import { migrate as migratePg } from "drizzle-orm/node-postgres/migrator";
import type { ResolvedRomeAppDbMetadata } from "../apps/types.js";
import { getDb, type DatabaseConfig, type DrizzleDb } from "./index.js";
import { getCoreRoot } from "../paths.js";
import { createLogger } from "../logger.js";

const log = createLogger("db-migrate");

export function getSystemMigrationsPath(): string {
  return join(getCoreRoot(), "drizzle", "system");
}

export function isMigrateCliEntrypoint(argv = process.argv): boolean {
  const entrypoint = argv[1];
  return (
    entrypoint === "src/db/migrate.ts" ||
    entrypoint === "dist/db/migrate.js" ||
    entrypoint?.endsWith("/src/db/migrate.ts") ||
    entrypoint?.endsWith("/dist/db/migrate.js") ||
    false
  );
}

function pickMigrator(config?: DatabaseConfig) {
  return config?.type === "postgresql" ? migratePg : migrateSqlite;
}

export async function migrateAppByMetadata(
  db: DrizzleDb,
  resolvedDb: ResolvedRomeAppDbMetadata,
  config?: DatabaseConfig,
): Promise<void> {
  const migrate = pickMigrator(config);
  await migrate(db as never, {
    migrationsFolder: resolvedDb.migrationsPath,
    migrationsTable: resolvedDb.migrationsTable,
  });
}

export interface RunMigrationsOptions {
  /**
   * Pre-resolved DB metadata for each installed app. Caller is expected to
   * have already booted the AppCatalog; this function does NOT enumerate the
   * lockfile on its own.
   */
  appDbMetadata?: readonly ResolvedRomeAppDbMetadata[];
}

export async function runMigrations(
  config?: DatabaseConfig,
  options: RunMigrationsOptions = {},
): Promise<void> {
  const db = getDb(config);
  const migrate = pickMigrator(config);

  await migrate(db as never, {
    migrationsFolder: getSystemMigrationsPath(),
    migrationsTable: "__drizzle_migrations_system",
  });

  for (const meta of options.appDbMetadata ?? []) {
    await migrateAppByMetadata(db, meta, config);
  }
}

// CLI entry point: run with `pnpm --filter @rome/core db:migrate`.
if (isMigrateCliEntrypoint()) {
  try {
    await runMigrations();
    log.info("Migrations completed successfully");
    process.exit(0);
  } catch (err) {
    log.error("Migration failed", { error: err });
    process.exit(1);
  }
}

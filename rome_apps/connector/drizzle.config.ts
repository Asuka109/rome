import "dotenv/config";
import { join } from "node:path";
import { homedir } from "node:os";
import { defineConfig } from "drizzle-kit";

const TABLE_PREFIX = "connector";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./src/db/migrations",
  dialect: "sqlite",
  migrations: { table: `__drizzle_migrations_app_${TABLE_PREFIX}` },
  tablesFilter: [`${TABLE_PREFIX}__*`],
  dbCredentials: {
    url:
      process.env.SQLITE_PATH ??
      join(homedir(), ".rome", process.env.ROME_PROFILE || "default", "rome.db"),
  },
});

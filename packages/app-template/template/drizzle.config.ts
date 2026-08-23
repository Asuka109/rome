import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./src/db/migrations",
  dialect: "sqlite",
  migrations: { table: "__drizzle_migrations_app___APP_TABLE_PREFIX__" },
  tablesFilter: ["__APP_TABLE_PREFIX__\\__*"],
});

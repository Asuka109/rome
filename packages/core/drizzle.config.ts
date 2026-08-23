import "dotenv/config";
import { join } from "path";
import { homedir } from "os";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: ["./src/db/schema/system.ts"],
  dialect: "sqlite",
  dbCredentials: {
    url:
      process.env.SQLITE_PATH ??
      join(homedir(), ".rome", process.env.ROME_PROFILE || "default", "rome.db"),
  },
});

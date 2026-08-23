import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

// Run-action-owned history table. The scaffold replaces the default table prefix.
export function createAppDbSchema(tablePrefix: string = "__APP_TABLE_PREFIX__") {
  const runs = sqliteTable(`${tablePrefix}__runs`, {
    id: text("id").primaryKey(),
    status: text("status", { enum: ["running", "success", "error"] }).notNull(),
    /** Distinguishes previews, where external writes must be disabled. */
    dryRun: integer("dry_run", { mode: "boolean" }).notNull(),
    input: text("input", { mode: "json" }),
    result: text("result", { mode: "json" }),
    error: text("error"),
    startedAt: integer("started_at", { mode: "timestamp" }).notNull(),
    finishedAt: integer("finished_at", { mode: "timestamp" }),
    durationMs: integer("duration_ms"),
  });

  return { runs };
}

const defaultSchema = createAppDbSchema();

export const runs = defaultSchema.runs;

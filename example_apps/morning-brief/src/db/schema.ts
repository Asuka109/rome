import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

// The workflow run-history table — part of the workflow app shell, not
// per-workflow. Every invocation of the run action records one row here
// (start → finish), so the run page can show recent runs with their status,
// timing, input, and result. The workflow code itself never touches this table;
// the run action owns it.
//
// `createAppDbSchema(tablePrefix)` mirrors the platform convention: the prefix
// keeps this app's tables namespaced inside the shared SQLite file.
export function createAppDbSchema(tablePrefix: string = "morning_brief") {
  const runs = sqliteTable(`${tablePrefix}__runs`, {
    id: text("id").primaryKey(),
    status: text("status", { enum: ["running", "success", "error"] }).notNull(),
    // True for verification/preview runs (external writes no-op); flagged so the
    // run page can distinguish a real run from a dry run.
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

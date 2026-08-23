import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

/**
 * Briefing data model. Three records the guardian (or the system) creates and
 * returns to — scouting tasks, their results, and brief runs — plus a settings
 * blob. Logical names only; the daemon joins the `briefing__` prefix.
 */
export function createAppDbSchema(tablePrefix: string = "briefing") {
  // A scouting task: a detailed prompt the assistant agent runs on an interval.
  const scouts = sqliteTable(
    `${tablePrefix}__scouts`,
    {
      id: text("id").primaryKey(),
      title: text("title").notNull(),
      /** The detailed prompt handed to the assistant agent as its task. */
      prompt: text("prompt").notNull(),
      /** How often the scout runs, in minutes. */
      intervalMinutes: integer("interval_minutes").notNull().default(360),
      enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
      lastRunAt: integer("last_run_at", { mode: "timestamp" }),
      createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
      updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
    },
    (t) => [index(`${tablePrefix}__scouts_enabled_idx`).on(t.enabled)],
  );

  // One run of a scout. `consumedAt` marks when a brief folded it in, so the
  // next brief only includes results gathered "since the last brief".
  const scoutResults = sqliteTable(
    `${tablePrefix}__scout_results`,
    {
      id: text("id").primaryKey(),
      scoutId: text("scout_id").notNull(),
      /** Snapshot of the scout title at run time (survives scout deletion). */
      scoutTitle: text("scout_title").notNull(),
      /** "pending" | "completed" | "skipped" (ran, nothing new) | "failed" */
      status: text("status").notNull().default("pending"),
      content: text("content"),
      error: text("error"),
      /** "schedule" | "manual" — how the run was triggered. */
      trigger: text("trigger").notNull().default("schedule"),
      consumedAt: integer("consumed_at", { mode: "timestamp" }),
      startedAt: integer("started_at", { mode: "timestamp" }).notNull(),
      finishedAt: integer("finished_at", { mode: "timestamp" }),
    },
    (t) => [
      index(`${tablePrefix}__scout_results_scout_idx`).on(t.scoutId),
      index(`${tablePrefix}__scout_results_consumed_idx`).on(t.consumedAt),
    ],
  );

  // One brief run (morning / evening / test).
  const briefs = sqliteTable(
    `${tablePrefix}__briefs`,
    {
      id: text("id").primaryKey(),
      /** "morning" | "evening" | "test" */
      kind: text("kind").notNull(),
      /** "pending" | "completed" | "failed" */
      status: text("status").notNull().default("pending"),
      content: text("content"),
      error: text("error"),
      /** Channel the brief was sent to, e.g. "whatsapp" | "email". */
      channel: text("channel"),
      delivered: integer("delivered", { mode: "boolean" }).notNull().default(false),
      deliveryError: text("delivery_error"),
      /** How many scout results were folded into this brief. */
      scoutResultCount: integer("scout_result_count").notNull().default(0),
      startedAt: integer("started_at", { mode: "timestamp" }).notNull(),
      finishedAt: integer("finished_at", { mode: "timestamp" }),
    },
    (t) => [index(`${tablePrefix}__briefs_kind_idx`).on(t.kind)],
  );

  const settings = sqliteTable(`${tablePrefix}__settings`, {
    key: text("key").primaryKey(),
    value: text("value").notNull(),
  });

  return { scouts, scoutResults, briefs, settings };
}

const defaultSchema = createAppDbSchema();

export const scouts = defaultSchema.scouts;
export const scoutResults = defaultSchema.scoutResults;
export const briefs = defaultSchema.briefs;
export const settings = defaultSchema.settings;

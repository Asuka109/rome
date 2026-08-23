import { randomUUID } from "node:crypto";
import { desc, eq } from "drizzle-orm";
import type { AppDbContext, DrizzleDb } from "@rome-os/app-runtime";
import { createAppDbSchema } from "../schema.js";

export type RunStatus = "running" | "success" | "error";

/** A run record as it crosses the wire to the web page: timestamps are epoch ms
 * (not `Date`) so the JSON the API returns is plain and stable. */
export interface WorkflowRunRecord {
  id: string;
  status: RunStatus;
  dryRun: boolean;
  input: unknown;
  result: unknown;
  error: string | null;
  startedAt: number;
  finishedAt: number | null;
  durationMs: number | null;
}

export class RunsRepository {
  private readonly tables;

  constructor(
    private readonly db: DrizzleDb,
    tablePrefix: string,
  ) {
    this.tables = createAppDbSchema(tablePrefix);
  }

  /** Record the start of a run; returns its id so `finish` can close it out. */
  start(input: unknown, dryRun: boolean): string {
    const id = randomUUID();
    this.db
      .insert(this.tables.runs)
      .values({
        id,
        status: "running",
        dryRun,
        input: input ?? null,
        result: null,
        error: null,
        startedAt: new Date(),
        finishedAt: null,
        durationMs: null,
      })
      .run();
    return id;
  }

  /** Close out a run as success (with its result) or error (with the message).
   * Duration is computed from the recorded start so it stays honest even if the
   * process clock drifts between calls. */
  finish(
    id: string,
    outcome: { status: "success"; result: unknown } | { status: "error"; error: string },
  ): void {
    const row = this.db.select().from(this.tables.runs).where(eq(this.tables.runs.id, id)).get();
    const startedAt = row?.startedAt ?? new Date();
    const finishedAt = new Date();
    this.db
      .update(this.tables.runs)
      .set({
        status: outcome.status,
        result: outcome.status === "success" ? (outcome.result ?? null) : null,
        error: outcome.status === "error" ? outcome.error : null,
        finishedAt,
        durationMs: finishedAt.getTime() - startedAt.getTime(),
      })
      .where(eq(this.tables.runs.id, id))
      .run();
  }

  /** The most recent runs, newest first. */
  recent(limit = 20): WorkflowRunRecord[] {
    const rows = this.db
      .select()
      .from(this.tables.runs)
      .orderBy(desc(this.tables.runs.startedAt))
      .limit(limit)
      .all();
    return rows.map((row) => ({
      id: row.id,
      status: row.status,
      dryRun: row.dryRun,
      input: row.input ?? null,
      result: row.result ?? null,
      error: row.error,
      startedAt: row.startedAt.getTime(),
      finishedAt: row.finishedAt ? row.finishedAt.getTime() : null,
      durationMs: row.durationMs,
    }));
  }
}

export function createRunsRepository(ctx: AppDbContext): RunsRepository {
  return new RunsRepository(ctx.connection, ctx.tablePrefix);
}

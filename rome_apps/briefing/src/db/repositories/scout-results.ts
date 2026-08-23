import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import type { AppDbContext, DrizzleDb } from "@rome-os/app-runtime";
import { createAppDbSchema } from "../schema.js";

export interface ScoutResult {
  id: string;
  scoutId: string;
  scoutTitle: string;
  status: string;
  content: string | null;
  error: string | null;
  trigger: string;
  consumedAt: Date | null;
  startedAt: Date;
  finishedAt: Date | null;
}

export class ScoutResultsRepository {
  private readonly tables;

  constructor(
    private readonly db: DrizzleDb,
    tablePrefix: string,
  ) {
    this.tables = createAppDbSchema(tablePrefix);
  }

  async start(scoutId: string, scoutTitle: string, trigger: string): Promise<string> {
    const id = crypto.randomUUID();
    this.db
      .insert(this.tables.scoutResults)
      .values({
        id,
        scoutId,
        scoutTitle,
        status: "pending",
        content: null,
        error: null,
        trigger,
        consumedAt: null,
        startedAt: new Date(),
        finishedAt: null,
      })
      .run();
    return id;
  }

  async finish(
    id: string,
    outcome: { status: "completed" | "failed" | "skipped"; content?: string; error?: string },
  ): Promise<void> {
    this.db
      .update(this.tables.scoutResults)
      .set({
        status: outcome.status,
        content: outcome.content ?? null,
        error: outcome.error ?? null,
        finishedAt: new Date(),
      })
      .where(eq(this.tables.scoutResults.id, id))
      .run();
  }

  /** Completed results not yet folded into a brief. */
  async listUnconsumed(): Promise<ScoutResult[]> {
    return this.db
      .select()
      .from(this.tables.scoutResults)
      .where(
        and(
          eq(this.tables.scoutResults.status, "completed"),
          isNull(this.tables.scoutResults.consumedAt),
        ),
      )
      .orderBy(desc(this.tables.scoutResults.finishedAt))
      .all() as ScoutResult[];
  }

  async markConsumed(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    this.db
      .update(this.tables.scoutResults)
      .set({ consumedAt: new Date() })
      .where(inArray(this.tables.scoutResults.id, ids))
      .run();
  }

  async listForScout(scoutId: string, limit = 20): Promise<ScoutResult[]> {
    return this.db
      .select()
      .from(this.tables.scoutResults)
      .where(eq(this.tables.scoutResults.scoutId, scoutId))
      .orderBy(desc(this.tables.scoutResults.startedAt))
      .limit(limit)
      .all() as ScoutResult[];
  }

  async listRecent(limit = 50): Promise<ScoutResult[]> {
    return this.db
      .select()
      .from(this.tables.scoutResults)
      .orderBy(desc(this.tables.scoutResults.startedAt))
      .limit(limit)
      .all() as ScoutResult[];
  }
}

export function createScoutResultsRepository(ctx: AppDbContext): ScoutResultsRepository {
  return new ScoutResultsRepository(ctx.connection, ctx.tablePrefix);
}

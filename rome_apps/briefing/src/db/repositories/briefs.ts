import { desc, eq } from "drizzle-orm";
import type { AppDbContext, DrizzleDb } from "@rome-os/app-runtime";
import { createAppDbSchema } from "../schema.js";

export interface Brief {
  id: string;
  kind: string;
  status: string;
  content: string | null;
  error: string | null;
  channel: string | null;
  delivered: boolean;
  deliveryError: string | null;
  scoutResultCount: number;
  startedAt: Date;
  finishedAt: Date | null;
}

export interface BriefFinish {
  status: "completed" | "failed";
  content?: string;
  error?: string;
  channel?: string;
  delivered?: boolean;
  deliveryError?: string;
  scoutResultCount?: number;
}

export class BriefsRepository {
  private readonly tables;

  constructor(
    private readonly db: DrizzleDb,
    tablePrefix: string,
  ) {
    this.tables = createAppDbSchema(tablePrefix);
  }

  async start(kind: string): Promise<string> {
    const id = crypto.randomUUID();
    this.db
      .insert(this.tables.briefs)
      .values({
        id,
        kind,
        status: "pending",
        content: null,
        error: null,
        channel: null,
        delivered: false,
        deliveryError: null,
        scoutResultCount: 0,
        startedAt: new Date(),
        finishedAt: null,
      })
      .run();
    return id;
  }

  async finish(id: string, outcome: BriefFinish): Promise<void> {
    this.db
      .update(this.tables.briefs)
      .set({
        status: outcome.status,
        content: outcome.content ?? null,
        error: outcome.error ?? null,
        channel: outcome.channel ?? null,
        delivered: outcome.delivered ?? false,
        deliveryError: outcome.deliveryError ?? null,
        scoutResultCount: outcome.scoutResultCount ?? 0,
        finishedAt: new Date(),
      })
      .where(eq(this.tables.briefs.id, id))
      .run();
  }

  async byId(id: string): Promise<Brief | undefined> {
    return this.db.select().from(this.tables.briefs).where(eq(this.tables.briefs.id, id)).get() as
      | Brief
      | undefined;
  }

  async listRecent(limit = 20): Promise<Brief[]> {
    return this.db
      .select()
      .from(this.tables.briefs)
      .orderBy(desc(this.tables.briefs.startedAt))
      .limit(limit)
      .all() as Brief[];
  }
}

export function createBriefsRepository(ctx: AppDbContext): BriefsRepository {
  return new BriefsRepository(ctx.connection, ctx.tablePrefix);
}

import { asc, eq } from "drizzle-orm";
import type { AppDbContext, DrizzleDb } from "@rome-os/app-runtime";
import { createAppDbSchema } from "../schema.js";

export interface Scout {
  id: string;
  title: string;
  prompt: string;
  intervalMinutes: number;
  enabled: boolean;
  lastRunAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface NewScout {
  title: string;
  prompt: string;
  intervalMinutes: number;
  enabled?: boolean;
}

export interface ScoutPatch {
  title?: string;
  prompt?: string;
  intervalMinutes?: number;
  enabled?: boolean;
}

export class ScoutsRepository {
  private readonly tables;

  constructor(
    private readonly db: DrizzleDb,
    tablePrefix: string,
  ) {
    this.tables = createAppDbSchema(tablePrefix);
  }

  async list(): Promise<Scout[]> {
    return this.db
      .select()
      .from(this.tables.scouts)
      .orderBy(asc(this.tables.scouts.createdAt))
      .all() as Scout[];
  }

  async byId(id: string): Promise<Scout | undefined> {
    return this.db.select().from(this.tables.scouts).where(eq(this.tables.scouts.id, id)).get() as
      | Scout
      | undefined;
  }

  async insert(input: NewScout): Promise<Scout> {
    const now = new Date();
    const row = {
      id: crypto.randomUUID(),
      title: input.title,
      prompt: input.prompt,
      intervalMinutes: input.intervalMinutes,
      enabled: input.enabled ?? true,
      lastRunAt: null,
      createdAt: now,
      updatedAt: now,
    };
    this.db.insert(this.tables.scouts).values(row).run();
    return row;
  }

  async update(id: string, patch: ScoutPatch): Promise<Scout | undefined> {
    const current = await this.byId(id);
    if (!current) return undefined;
    const next: Scout = {
      ...current,
      ...patch,
      updatedAt: new Date(),
    };
    this.db
      .update(this.tables.scouts)
      .set({
        title: next.title,
        prompt: next.prompt,
        intervalMinutes: next.intervalMinutes,
        enabled: next.enabled,
        updatedAt: next.updatedAt,
      })
      .where(eq(this.tables.scouts.id, id))
      .run();
    return next;
  }

  async markRun(id: string): Promise<void> {
    this.db
      .update(this.tables.scouts)
      .set({ lastRunAt: new Date() })
      .where(eq(this.tables.scouts.id, id))
      .run();
  }

  async remove(id: string): Promise<boolean> {
    const existing = await this.byId(id);
    if (!existing) return false;
    this.db.delete(this.tables.scouts).where(eq(this.tables.scouts.id, id)).run();
    return true;
  }
}

export function createScoutsRepository(ctx: AppDbContext): ScoutsRepository {
  return new ScoutsRepository(ctx.connection, ctx.tablePrefix);
}

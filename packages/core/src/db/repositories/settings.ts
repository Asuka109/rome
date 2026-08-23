import { eq } from "drizzle-orm";
import { settings } from "../schema.js";
import type { DrizzleDb } from "../index.js";

export class SettingsRepository {
  constructor(private db: DrizzleDb) {}

  async get<T = unknown>(key: string): Promise<T | null> {
    const rows = await this.db.select().from(settings).where(eq(settings.key, key));
    if (rows.length === 0) return null;
    return rows[0].value as T;
  }

  async set(key: string, value: unknown): Promise<void> {
    const now = new Date();
    const existing = await this.db.select().from(settings).where(eq(settings.key, key));

    if (existing.length > 0) {
      await this.db.update(settings).set({ value, updatedAt: now }).where(eq(settings.key, key));
    } else {
      await this.db.insert(settings).values({
        key,
        value,
        updatedAt: now,
      });
    }
  }

  async delete(key: string): Promise<void> {
    await this.db.delete(settings).where(eq(settings.key, key));
  }

  async getAll(): Promise<Record<string, unknown>> {
    const rows = await this.db.select().from(settings);
    const result: Record<string, unknown> = {};
    for (const row of rows) {
      result[row.key] = row.value;
    }
    return result;
  }
}

export function createSettingsRepository(db: DrizzleDb) {
  return new SettingsRepository(db);
}

import { eq } from "drizzle-orm";
import type { AppDbContext, DrizzleDb } from "@rome-os/app-runtime";
import { createAppDbSchema } from "../schema.js";

export interface BriefingSettings {
  /** Where briefs are delivered: "whatsapp" | "email". */
  channel: string;
  /** WhatsApp chat/thread id (the JID). Required when channel is whatsapp. */
  whatsappThreadId: string;
  /** Email recipient; the literal "guardian" resolves to the guardian's address. */
  emailTo: string;
  /** IANA timezone the brief times are interpreted in. */
  timezone: string;
  /** Morning brief on/off + local HH:mm. */
  morningEnabled: boolean;
  morningTime: string;
  /** Evening brief on/off + local HH:mm. */
  eveningEnabled: boolean;
  eveningTime: string;
}

export const DEFAULT_SETTINGS: BriefingSettings = {
  channel: "email",
  whatsappThreadId: "",
  emailTo: "guardian",
  timezone: "America/Los_Angeles",
  morningEnabled: false,
  morningTime: "08:00",
  eveningEnabled: true,
  eveningTime: "23:00",
};

const SETTINGS_KEY = "briefing_settings";

export class SettingsRepository {
  private readonly tables;

  constructor(
    private readonly db: DrizzleDb,
    tablePrefix: string,
  ) {
    this.tables = createAppDbSchema(tablePrefix);
  }

  async get(): Promise<BriefingSettings> {
    const row = this.db
      .select()
      .from(this.tables.settings)
      .where(eq(this.tables.settings.key, SETTINGS_KEY))
      .get();
    if (!row) return { ...DEFAULT_SETTINGS };
    try {
      return { ...DEFAULT_SETTINGS, ...(JSON.parse(row.value) as Partial<BriefingSettings>) };
    } catch {
      return { ...DEFAULT_SETTINGS };
    }
  }

  async save(next: BriefingSettings): Promise<void> {
    const t = this.tables.settings;
    const value = JSON.stringify(next);
    const existing = this.db.select().from(t).where(eq(t.key, SETTINGS_KEY)).get();
    if (existing) {
      this.db.update(t).set({ value }).where(eq(t.key, SETTINGS_KEY)).run();
    } else {
      this.db.insert(t).values({ key: SETTINGS_KEY, value }).run();
    }
  }
}

export function createSettingsRepository(ctx: AppDbContext): SettingsRepository {
  return new SettingsRepository(ctx.connection, ctx.tablePrefix);
}

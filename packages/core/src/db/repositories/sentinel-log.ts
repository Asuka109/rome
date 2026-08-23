import { eq, inArray } from "drizzle-orm";
import { v4 as uuid } from "uuid";
import { sentinelLog } from "../schema.js";
import type { DrizzleDb } from "../index.js";

export class SentinelLogRepository {
  constructor(private db: DrizzleDb) {}

  async create(data: {
    messageId: string;
    channel: string;
    channelUserId: string;
    displayName?: string;
    threadId?: string;
    text?: string;
    action: "replied" | "ignored" | "escalated";
    response?: string;
  }) {
    const id = uuid();
    const now = new Date();
    await this.db.insert(sentinelLog).values({
      id,
      messageId: data.messageId,
      channel: data.channel,
      channelUserId: data.channelUserId,
      displayName: data.displayName ?? null,
      threadId: data.threadId ?? null,
      text: data.text ?? null,
      action: data.action,
      response: data.response ?? null,
      reviewed: false,
      createdAt: now,
    });
    return id;
  }

  async findUnreviewed() {
    return this.db.select().from(sentinelLog).where(eq(sentinelLog.reviewed, false));
  }

  async markReviewed(ids: string[]) {
    if (ids.length === 0) return;
    await this.db.update(sentinelLog).set({ reviewed: true }).where(inArray(sentinelLog.id, ids));
  }
}

export function createSentinelLogRepository(db: DrizzleDb) {
  return new SentinelLogRepository(db);
}

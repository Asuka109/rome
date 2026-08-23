import { desc, eq, sql } from "drizzle-orm";
import type { AppDbContext } from "@rome-os/app-runtime";
import { emittedEvents } from "../db/schema.js";

export interface EmittedEventRow {
  eventId: string;
  topic: string;
  provider: string;
  eventType: string;
  receivedAt: Date;
  payloadJson: string;
}

export const EMITTED_EVENTS_RING_CAP = 500;

export class EventsRepo {
  constructor(private readonly db: AppDbContext) {}

  /**
   * Returns true when the event was inserted; false when it was a no-op
   * (Composio retry with the same eventId).
   */
  async insertEventIfAbsent(row: EmittedEventRow): Promise<boolean> {
    const result = await this.db.connection
      .insert(emittedEvents)
      .values(row)
      .onConflictDoNothing({ target: emittedEvents.eventId });
    return result.changes > 0;
  }

  async pruneRingBuffer(cap: number = EMITTED_EVENTS_RING_CAP): Promise<void> {
    await this.db.connection.run(sql`
      DELETE FROM ${emittedEvents}
      WHERE ${emittedEvents.eventId} IN (
        SELECT ${emittedEvents.eventId} FROM ${emittedEvents}
        ORDER BY ${emittedEvents.receivedAt} DESC
        LIMIT -1 OFFSET ${cap}
      )
    `);
  }

  async listEvents(opts: { topic?: string; limit: number }): Promise<EmittedEventRow[]> {
    const baseQuery = this.db.connection.select().from(emittedEvents);
    const filtered = opts.topic ? baseQuery.where(eq(emittedEvents.topic, opts.topic)) : baseQuery;
    return filtered.orderBy(desc(emittedEvents.receivedAt)).limit(opts.limit);
  }
}

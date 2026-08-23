import { index, integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

const PREFIX = "showcases__";

export const collections = sqliteTable(
  `${PREFIX}collections`,
  {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    description: text("description"),
    source: text("source").notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    index("idx_showcases_collections_source").on(table.source),
    index("idx_showcases_collections_updated_at").on(table.updatedAt),
  ],
);

export const traces = sqliteTable(
  `${PREFIX}traces`,
  {
    id: text("id").primaryKey(),
    collectionId: text("collection_id").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    capturedAt: integer("captured_at", { mode: "timestamp" }).notNull(),
    blocksJson: text("blocks_json").notNull(),
    snapshotJson: text("snapshot_json").notNull(),
    summaryJson: text("summary_json").notNull(),
    metadataJson: text("metadata_json").notNull(),
    inputTokens: integer("input_tokens"),
    outputTokens: integer("output_tokens"),
    cacheReadTokens: integer("cache_read_tokens"),
    cacheWriteTokens: integer("cache_write_tokens"),
    costUsd: real("cost_usd"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    index("idx_showcases_traces_collection_id").on(table.collectionId),
    index("idx_showcases_traces_captured_at").on(table.capturedAt),
  ],
);

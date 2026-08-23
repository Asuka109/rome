import type { DrizzleDb } from "../db/index.js";
import { GitSyncSource } from "./git-source.js";
import type { SyncSource, SyncSourceDescriptor, SyncSourceId } from "./types.js";

/** A sync source class: newable with a `db` and carrying a static descriptor
 * the registry can read without instantiating. */
type SyncSourceClass = {
  readonly descriptor: SyncSourceDescriptor;
  new (db: DrizzleDb): SyncSource;
};

/**
 * The single place that knows which sync sources exist. Adding a
 * source — e.g. Google Drive — means adding one class entry here; nothing
 * else in core, the routes, or the web components changes.
 */
const SOURCE_CLASSES: Record<SyncSourceId, SyncSourceClass> = {
  git: GitSyncSource,
};

export function listSyncSourceDescriptors(): SyncSourceDescriptor[] {
  // Read each source's static descriptor directly — no throwaway instance, so a
  // future source whose constructor touches `db` won't crash descriptor loading.
  return Object.values(SOURCE_CLASSES).map((cls) => cls.descriptor);
}

export function getSyncSource(db: DrizzleDb, id: SyncSourceId): SyncSource | null {
  const cls = SOURCE_CLASSES[id];
  return cls ? new cls(db) : null;
}

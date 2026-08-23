import { Mutex } from "async-mutex";

/**
 * A mutex keyed by string. Work submitted for the same key runs serially, in
 * submission order (FIFO); work for different keys runs concurrently. This is
 * the per-resource serialization primitive behind per-app, per-grant, and
 * per-session critical sections — replacing the hand-rolled
 * `Map<key, Promise>` + `chain.then(work, work)` idiom those sites used.
 *
 * Each key's underlying {@link Mutex} is created lazily on first use and evicted
 * once no work is queued or running for it (reference-counted), so the map never
 * grows unbounded over a large or open-ended key space (grants, sessions, app
 * ids). A rejected task never blocks later work for its key — the mutex releases
 * whether the callback resolves or throws — and the task's own result/rejection
 * is returned to its caller unchanged.
 */
export class KeyedMutex {
  private readonly entries = new Map<string, KeyEntry>();

  /**
   * Run `work` exclusively with respect to other work submitted for the same
   * `key`. Resolves/rejects with `work`'s own outcome. A rejection is isolated:
   * it does not poison the key's queue, and the next waiter still runs.
   */
  runExclusive<T>(key: string, work: () => T | Promise<T>): Promise<T> {
    const entry = this.entries.get(key) ?? this.createEntry(key);
    entry.refs += 1;
    return entry.mutex.runExclusive(work).finally(() => {
      entry.refs -= 1;
      // Evict only when this key has no remaining waiters AND the map still
      // points at this exact entry — guards against dropping a replacement
      // entry that a later acquirer created after this one was drained.
      if (entry.refs === 0 && this.entries.get(key) === entry) {
        this.entries.delete(key);
      }
    });
  }

  /** True while work is currently running for `key`. */
  isLocked(key: string): boolean {
    return this.entries.get(key)?.mutex.isLocked() ?? false;
  }

  /** Number of keys with live (queued or running) work. Introspection/tests. */
  get size(): number {
    return this.entries.size;
  }

  private createEntry(key: string): KeyEntry {
    const entry: KeyEntry = { mutex: new Mutex(), refs: 0 };
    this.entries.set(key, entry);
    return entry;
  }
}

interface KeyEntry {
  readonly mutex: Mutex;
  /** Waiters currently queued or running for the key; the entry is evicted at 0. */
  refs: number;
}

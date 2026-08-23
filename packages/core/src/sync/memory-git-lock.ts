/**
 * Serializes every write to the memory git repo (`~/.rome/<profile>/memory/.git`).
 *
 * Two writers touch it: the per-edit auto-commit in the file-browser server and
 * the sync push/pull in `GitSyncSource`. Without serialization they interleave —
 * tripping git's `index.lock` or committing a half-staged tree. One
 * daemon owns the repo, so an in-process mutex is sufficient; no cross-process
 * file lock is needed.
 */

import { Mutex } from "async-mutex";

const mutex = new Mutex();

/** Run `fn` once all previously-queued memory-git work has settled. Failures in
 * one task never break serialization for the next (the mutex releases either
 * way); `fn`'s own result/rejection is returned to the caller. */
export function withMemoryGitLock<T>(fn: () => T | Promise<T>): Promise<T> {
  return mutex.runExclusive(fn);
}

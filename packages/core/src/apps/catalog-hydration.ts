import type { AppCatalog } from "./catalog.js";
import { readLockfileWithEntryIsolation } from "./lockfile.js";

/**
 * Read-only catalog hydration for passive app-domain views, such as action
 * workers. This deliberately avoids AppManager.boot(): no migration, no staging
 * sweep, no probe, and no lockfile writes.
 */
export async function hydrateCatalogFromLockfile(opts: {
  lockfilePath: string;
  catalog: AppCatalog;
}): Promise<void> {
  const { lockfile } = await readLockfileWithEntryIsolation(opts.lockfilePath);
  for (const appId of Object.keys(lockfile.apps)) {
    await opts.catalog.refresh(appId);
  }
}

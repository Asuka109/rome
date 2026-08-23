# App Lifecycle

How install, uninstall, and boot are decomposed inside the daemon: which component owns each state transition, and the ordering rules that keep a crash or a reload from corrupting the running registry. The contracts callers observe — operation outcomes, lockfile states, store guarantees — live on the [app concepts](../concepts/apps.md) and are not restated here.

## Ownership

The domain is imperative: each operation is a blocking call that runs to a terminal [lockfile state](../concepts/apps.md#lockfile). There is no reconcile loop and no file watcher.

```
caller ──install / uninstall / enable──► manager ──uses──► installer ──writes──► bundle store
                                            │ refresh
                                            ▼
                                         catalog ──ordered events──► runtime subscribers
```

### Invariants

- The manager owns every state transition: it is the sole lockfile writer and the sole trigger of catalog refresh.
- The installer is pure materialization: source in, content-addressed bundle out. It knows nothing about the lockfile or the catalog, and it only ever receives packed bundles — the build step for a source install runs above it.
- The catalog is the only read surface. Subscribers fire in registration order, sequentially, and must be idempotent: boot replays one event per app, and a re-install fires a second event for the same bundle.
- Subscriber order is load-bearing: agents load before the actions that reference them, and actions register before the hooks that depend on them.

## Crash model

### Invariants

- The live symlink swaps before the lockfile records the new hash. A crash between the two writes is caught by the next boot probe, which marks the app [broken](../concepts/apps.md#lockfile).
- A failed boot probe marks the app broken and boot continues. The system app is the exception: its failed probe is fatal.
- A single corrupt lockfile entry is salvaged as broken and boot continues. Only whole-file corruption is fatal.
- Staging residue from an interrupted install is swept at the next boot, never reused.

## Boot convergence

### Invariants

- Boot converges first-party apps from the packed artifacts shipped with the build: a missing app installs, a drifted content hash reinstalls with the enabled flag preserved, and an app dropped from the distribution uninstalls without purging data.
- First-party upgrades happen only at boot, so first-party apps never appear as update candidates.
- Boot installs, never packs. Packing is a [build step](build.md#first-party-app-pre-packing).
- Boot fails loudly when no packed first-party artifacts exist, or when a core agent references an app with no packed artifact.

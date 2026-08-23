# Build & Layout

How the repository is laid out, how the runtime image is assembled from it, and the boundaries the build and the layout enforce.

## Runtime image

The Docker build consumes a generated runtime workspace, not the repository root. The generated workspace holds only the packages the runtime needs.

### Invariants

- A package outside the runtime set cannot enter the image. The generated workspace omits it, and the closure check fails the build when a runtime package imports it.
- The closure check's forbidden set includes Rome Cloud paths that match no package in the tree. The entries are tombstones that keep cloud code from drifting into the image, not dead configuration.

## Monorepo layout

Two parallel trees hold the code: first-party packages that ship with Rome, and plugin [apps](../concepts/apps.md). The repository root orchestrates the workspace and is not itself a package the runtime consumes.

### Invariants

- The repository root declares development tooling only. No runtime code resolves a dependency the root declares.
- Everything in the plugin tree is a plugin app, with no halfway state. Platform code never imports from the plugin tree: the runtime reaches an app only through [install](../concepts/apps.md#lifecycle-operations).

## First-party app pre-packing

Every first-party app is [packed](app-artifact.md) at build time, and boot installs the packed artifacts ([boot convergence](app-lifecycle.md#boot-convergence)).

### Invariants

- Every path that produces a runnable Rome runs the pre-pack step before the daemon starts. Packing is a build concern — boot [installs, never packs](app-lifecycle.md#boot-convergence).
- The pre-pack output is recreated from scratch on every run and is exactly the pack output of the current tree. An app deleted from the plugin tree leaves no stale packed artifact behind.

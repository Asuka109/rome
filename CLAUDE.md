# Rome

A pnpm monorepo. All code lives under `packages/*` and `rome_apps/*`. Runtime dependencies are declared in `packages/core` — the root `package.json` holds only the dev toolchain, and its scripts delegate to the right workspace via `pnpm --filter`.

- `packages/core/` (`@rome/core`) — backend runtime: Hono server, agent/action/event subsystems, DB, channel adapters. `src/index.ts` wires the object graph via dependency injection.
- `packages/web/` (`rome-web`) — Rsbuild SPA dashboard, served by the backend. Guardian-only.
- `packages/ui/` (`@rome-os/ui`) — shared React component kit for the dashboard and apps.
- `packages/app-runtime-sdk/` (`@rome-os/app-runtime`) and `packages/app-web-sdk/` (`@rome-os/app-web-sdk`) — SDKs consumed by apps.
- `packages/desktop/` (`rome-desktop`) — Electron shell.
- `packages/cdp-client/` (`rome-cdp-client`) — standalone CDP client.
- `rome_apps/*` — runtime-loaded apps (plugins), each a workspace package.

## Playbook

- Before opening a PR, read [`docs/authoring/prs.md`](docs/authoring/prs.md).
- Before setting up, running, or verifying the repository, follow [`docs/development.md`](docs/development.md).
- Before explaining a concept or asserting how a surface behaves, check [`docs/`](docs/README.md) and link instead of re-deriving.
- Before building or editing an app, read [`rome_apps/CLAUDE.md`](rome_apps/CLAUDE.md).
- When writing prose (docs, PR text), follow [`docs/authoring/WRITING.md`](docs/authoring/WRITING.md).
- When writing or editing code comments, follow [`docs/authoring/comments.md`](docs/authoring/comments.md).
- When a PR touches `@rome-os/app-runtime`, `@rome-os/app-web-sdk`, or `@rome-os/ui`, choose the Conventional Commit type by consumer impact. Test-only changes use `test:` and do not bump the package; releasable changes use `feat:` / `fix:` / `feat!:` (or `BREAKING CHANGE:` in the body). release-please publishes them to npm from Conventional Commits, with no per-PR changeset file. Full flow in [`docs/releases.md`](docs/releases.md).
- When adding a runtime dependency, declare it in `packages/core`.
- When bumping `@playwright/test`, re-pin the `layout-invariants` container image in [`.github/workflows/ci.yml`](.github/workflows/ci.yml) to the matching release's digest (`docker buildx imagetools inspect mcr.microsoft.com/playwright:v<version>-noble` prints it). The image ships the browsers, the pin decides the client, and they are separate edits. Check the guard step's parse of `playwright install --dry-run` in the same pass, since it reads a CLI label that upstream can reword. The guard fails readably when the image and the client disagree.
- When accessing the database, go through a repository. Core schema is `packages/core/src/db/schema.ts`, app schemas are `rome_apps/*/db/schema.ts`.
- When adding config, validate it with Zod in `packages/core/src/config.ts` and add it to `packages/core/.env.example`.
- When logging, use `createLogger(component)` from `packages/core/src/logger.ts`.

## Traps

**Imports carry `.js` extensions even for TypeScript files.** The repo is `"type": "module"`. Inside `packages/core`, `@/*` maps to `./src/*`.

**A migration that breaks an interface first breaks every consumer that has not migrated yet.** Keep existing interfaces, schemas, and contracts working while new behavior lands alongside them, and sequence the break last or behind a switch.

**A new dev-only branch in a production path ships to production.** Prefer an existing config or env switch, and put seeding and fixtures in setup scripts such as `scripts/dev-up.sh`.

# example_apps

Reference apps that ship with the repo but are **not** installed in a running
Rome. They exist to be *read* (golden references for skills) and *seeded* (as
editable starters the guardian can build themselves) — never to run as
first-party apps.

## How they differ from `rome_apps/*`

| | `rome_apps/*` | `example_apps/*` |
| --- | --- | --- |
| Packed by `pnpm build:apps` | yes (`dist/first-party-artifacts/`) | no (the glob only matches `rome_apps/*`) |
| Installed at boot | yes (every packed artifact) | no |
| pnpm workspace member | yes | yes — so `pnpm -r typecheck` keeps them from rotting |
| Role | shipped product | skill reference + editable starter |

## Seeding

At boot, `packages/core/src/profile-example-apps.ts` copies every app here that
carries an `app.yaml` into the per-profile example-apps dir
(`~/.rome/<profile>/projects/example-apps/<appId>`) — kept separate from the
guardian's own authoring dir (`projects/apps`) so seeded starters never clutter
the apps they author. It is **directory-level copy-if-missing**, so it seeds once
and never overwrites a guardian's edits. The seeded copy is plain source: not
installed, no `.git` (the app-creation flow `git init`s on build), and with
`node_modules`/`dist` excluded.

The Docker runtime image ships this directory as plain **source** —
`scripts/docker/prepare-runtime-workspace.mjs` copies `example_apps/` into the
curated runtime workspace (alongside `rome_apps/`), but **not** as a pnpm
workspace member, so it stays out of the install/build closure. That keeps the
source readable at runtime for the skill reference and present for boot seeding,
while `node_modules`/`dist`/tests are dropped by the copy filter.

## Current apps

- `morning-brief/` — the worked reference for the `workflow_creation` skill: one
  `runWorkflow` function exercising every control-flow shape over in-file
  fixtures, so it runs with zero setup.

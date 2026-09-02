# Development

This is the shared development guide for contributors and agents.

## Prerequisites

The preferred environment is the repository's Nix development shell. It pins
the Node.js and pnpm versions used by the project. Rome and its observability
stack also require OrbStack or Docker Desktop with Docker Compose.

Without Nix, install Node.js 24, Corepack, pnpm 11.6, Docker, and Docker
Compose. The non-Nix setup can run the project, but contributors must keep its
tool versions aligned with `package.json`.

## Set up the checkout

Enter the development shell before installing dependencies so native modules
are built for the correct Node.js version:

```bash
nix develop
pnpm install
pnpm dev:all
```

The repository also includes an `.envrc` for direnv users. After installing
direnv, `direnv allow` enters the same Nix environment automatically.

Without Nix, activate the repository's pnpm version before installing:

```bash
corepack enable
corepack prepare pnpm@11.6.0 --activate
pnpm install
pnpm dev:all
```

## Use the development stack

`pnpm dev:all` is the primary development entry point. It starts:

- the worktree's containerized Rome instance with `tsx --watch`;
- the Rsbuild development server;
- the shared Traefik router; and
- the shared rome-obs stack.

The command exits after the stack is ready and prints the dashboard, logging,
observability, and shutdown commands. It connects to `https://romeos.cc` by
default. Set `ROME_DEV_PANTHEON_ORIGIN` to use another Rome Cloud deployment.

Open the dashboard URL from the banner. A new instance has no default account
and starts in the browser onboarding flow.

Watched source files update without a restart. After changing dependencies,
container configuration, or container environment variables, run
`pnpm dev:all` again. The script reconciles the containers and installs the
current lockfile inside the Rome container.

Run commands inside that container with `./r`:

```bash
./r pnpm test
./r bash
```

Other focused development commands are:

```bash
pnpm start:web:mock # packages/web with mock data
pnpm dev:desktop    # host-native Electron shell
pnpm dev:cdp        # CDP client
```

Use `pnpm start` and `pnpm start:web` only to debug host processes. They skip
the production-shaped container wiring and do not share state with
`pnpm dev:all`.

## Verify a change

Run the general checks in this order:

1. `pnpm typecheck`
2. `pnpm test:unit`
3. `pnpm dev:all`
4. Confirm the Rome container logs contain `Rome started`.
5. For UI changes, exercise the changed flow in a browser.

Run the narrower lint command for the files changed by the work. Root scripts
include `pnpm lint:agents`, `pnpm lint:prose`, and `pnpm lint:sh`.

## Test environment

Package test scripts run through `scripts/test-env.sh`, which starts the test
process with `env -i`. Runtime configuration and credentials from the invoking
shell therefore do not silently affect tests.

The wrapper preserves only `PATH`, `HOME`, and platform temporary-directory
variables. It fixes `NODE_ENV=test`, `TZ=UTC`, and the locale to `C`. It also
preserves the presence of `CI` and `GITHUB_ACTIONS`, which test runners use to
reject focused tests and emit workflow annotations. Non-interactive output is
fixed to no-color mode; interactive watch runs retain terminal presentation.

Additions to the allowlist must be explicit and covered by
`scripts/test-env.test.ts`. Do not add application configuration or secrets.
Tests that read or write home-derived state must redirect it to a temporary
directory, as the core `createTestRome` harness does.

Set configuration for a deliberately environment-backed test inside the
scrubbed process:

```bash
scripts/test-env.sh env TEST_DATABASE_URL=postgres://... pnpm exec rstest -c packages/core/rstest.config.ts path/to/example.integration.test.ts
```

The launcher supports the project's macOS and Linux environments and requires
a POSIX shell. On Windows, use WSL or the development container.

## Per-worktree state

`pnpm dev:all` gives each worktree a separate host directory backing the
container's `~/.rome`:

```text
host:      ~/.rome-worktrees/<slug>/
container: /rome-home/.rome/
```

The bind mount keeps each worktree's lockfile, SQLite database, app data,
memory, and runtime status isolated. The slug logic lives in
`scripts/dev-up.sh` and `compose.dev.yml`; Rome itself still sees its normal
single-tenant paths. See `docs/architecture/process.md` for the process
invariant.

Use the stop or reset commands printed by `pnpm dev:all`. Remove a worktree's
containers and volumes before deleting the Git worktree so its state directory
does not become orphaned.

## Logging

The backend writes structured JSON logs to stdout. Rome currently exports OTEL
traces, but the log bridge into rome-obs is not live, so `otel_logs` in
ClickHouse remains empty. Until that bridge exists, tail the Rome container:

```bash
docker compose -f compose.dev.yml -p "$(scripts/worktree-slug.sh)" logs -f rome | jq
```

Traces are available in HyperDX at `http://obs.rome.localhost:3000` and through
ClickHouse SQL. See `docs/observability/schema.md`.

## Troubleshooting

### Native modules fail after entering the Nix shell

A dependency tree installed under another Node.js version can pass its own
install checks and then fail inside the development shell. Enter `nix develop`
and rebuild the native modules:

```bash
pnpm rebuild -r
```

Running `pnpm install` alone does not repair an up-to-date tree.

### Biome does not run on NixOS

Use the `biome` binary from `nix develop` on the host. The npm binary does not
run directly on NixOS. `pnpm lint` remains available in CI and the development
container.

### The stack does not become ready

Use the log command printed by `pnpm dev:all`. The script waits for both
`/api/health` and `/api/bootstrap`; a readiness failure names the Rome
container to inspect.

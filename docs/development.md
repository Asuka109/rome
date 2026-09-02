# Development

## Set up the checkout

Use the Nix development shell when Nix is available. It pins the toolchain that
the repository builds against.

1. Enter the development shell.

   ```bash
   nix develop
   ```

2. Install dependencies.

   ```bash
   pnpm install
   ```

3. Start the development stack.

   ```bash
   pnpm dev:all
   ```

Without Nix, install Node.js 24, Corepack, pnpm 11.6, Docker, and Docker
Compose. Then enable the repository's pinned pnpm version before installing
dependencies.

```bash
corepack enable
corepack prepare pnpm@11.6.0 --activate
pnpm install
pnpm dev:all
```

The stack connects to `https://romeos.cc` by default. Set
`ROME_DEV_PANTHEON_ORIGIN` to use another Rome Cloud deployment.

## Use the development stack

`pnpm dev:all` starts containerized Rome with `tsx --watch`, the Rsbuild
development server, Traefik, and rome-obs. The command exits after the stack is
ready and prints its URLs, log command, and stop command.

Open the dashboard URL from the banner. A new development instance starts with
the browser onboarding flow. It has no default account.

Source files covered by the watchers update without a restart. If dependencies,
container configuration, or container environment variables change, run
`pnpm dev:all` again. The script reconciles the stack and installs the current
lockfile inside the Rome container.

Use `./r <command>` to run a command in the Rome container. For example:

```bash
./r pnpm test
```

For frontend-only work in `packages/web`, run `pnpm start:web:mock`. Use
`pnpm start` or `pnpm start:web` only when debugging a host process. Those
commands skip the production-shaped development stack.

## Verify a change

Run checks in this order:

1. Run the host type check.

   ```bash
   pnpm typecheck
   ```

2. Run the unit test suite.

   ```bash
   pnpm test:unit
   ```

3. Start or reconcile the stack.

   ```bash
   pnpm dev:all
   ```

4. Confirm the Rome container logs contain `Rome started`.
5. If the change affects the UI, exercise the changed flow in a browser.

Run the narrower lint command for files changed by the work. The repository
exposes these commands in the root `package.json`, including `pnpm lint:agents`,
`pnpm lint:prose`, and `pnpm lint:sh`.

## Common problems

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

Read the log command printed by `pnpm dev:all`. The script waits for both
`/api/health` and `/api/bootstrap`, so a readiness failure includes the Rome
container name to inspect.

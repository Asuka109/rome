#!/usr/bin/env bash
# Run a command inside the worktree's Rome container.
#
# Usage:
#   ./r pnpm test
#   ./r pnpm typecheck
#   ./r node scripts/foo.ts
#   ./r bash             # interactive shell
#
# Expands to `docker exec` against the compose-managed container
# `<slug>-rome-1`. Bypassing `docker compose exec` sidesteps compose-file
# parsing — the wrapper stays callable without sourcing dev-up's env.
#
# Requires the worktree's stack to be up (`pnpm dev:all`).
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"
slug="$(scripts/worktree-slug.sh)"
container="${slug}-rome-1"

if ! docker ps --filter "name=^${container}$" --format '{{.Names}}' | grep -q .; then
  echo "./r: container \"${container}\" is not running — start the stack with \`pnpm dev:all\`." >&2
  exit 1
fi

# Allocate a TTY only when stdin is one; piped invocations (./r cmd < file)
# must not get -t, otherwise Docker errors with "the input device is not a TTY".
tty_flag=""
[ -t 0 ] && tty_flag="-t"

exec docker exec -i $tty_flag -w /workspace "$container" "$@"

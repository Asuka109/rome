#!/usr/bin/env bash
# Verify that the committed Drizzle migrations are in sync with the schema files.
#
# Regenerates every migration set from its `schema.ts` and fails if the working
# tree changes — i.e. someone edited a schema but forgot to run the matching
# `db:generate` and commit the new migration. Drizzle `generate` only diffs the
# schema against the stored snapshot; it never touches a database, so this is
# safe to run anywhere (CI included) without a live `rome.db` / DATABASE_URL.
#
# Usage: scripts/check-db-schema.sh
#
# To fix a failure, regenerate the offending migration set (e.g.
# `pnpm db:generate:system`, `pnpm db:generate:apps`, or `drizzle-kit generate`
# in the owning package) and commit the result.
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

# packages/core's system schema lives behind drizzle.system.config.ts and writes
# to packages/core/drizzle/system. (The sibling drizzle.config.ts has no `out`
# and is push/studio-only; drizzle.authoring.config.ts targets a dev app's
# private dir, not a committed tree — both are intentionally excluded.)
echo "check-db-schema: regenerating system migrations ..."
pnpm db:generate:system
migration_paths=(packages/core/drizzle/system)

# Invoke the repo-root drizzle-kit binary by absolute path. The app templates
# under packages/app-template/* are NOT pnpm workspace members, so `pnpm exec`
# there treats each dir as a standalone project and writes a stray pnpm-lock.yaml
# — calling the hoisted binary directly avoids that side effect entirely.
drizzle_kit="$PWD/node_modules/.bin/drizzle-kit"

# Every other committed migration tree is owned by a standard `drizzle.config.ts`
# that emits to `<pkg>/src/db/migrations`. Discover them by the committed
# meta/_journal.json so first-party apps (rome_apps/*), example apps, the app
# templates are all covered automatically as packages come and go
# — no hard-coded list to drift. drizzle-kit resolves the config's relative
# paths against the cwd, so run it from each package root.
while IFS= read -r config; do
  dir="$(dirname "$config")"
  [ -f "$dir/src/db/migrations/meta/_journal.json" ] || continue
  echo "check-db-schema: regenerating migrations for ${dir} ..."
  (cd "$dir" && "$drizzle_kit" generate)
  migration_paths+=("$dir/src/db/migrations")
done < <(git ls-files '*/drizzle.config.ts')

# `git status --porcelain` reports both modified tracked files and brand-new
# untracked migration files — a plain `git diff` would miss the latter — and is
# read-only, so there's no index to stage or reset. Empty output == in sync.
drift="$(git status --porcelain -- "${migration_paths[@]}")"
if [ -n "$drift" ]; then
  echo >&2
  echo "check-db-schema: ERROR — generated migrations are out of date." >&2
  echo "A schema was changed without committing the regenerated migration." >&2
  echo "Regenerate the offending migration set (e.g. \`pnpm db:generate:system\`," >&2
  echo "\`pnpm db:generate:apps\`, or \`drizzle-kit generate\` in the owning" >&2
  echo "package) and commit the result. Offending paths:" >&2
  echo >&2
  echo "$drift" >&2
  exit 1
fi

echo "check-db-schema: migrations are in sync."

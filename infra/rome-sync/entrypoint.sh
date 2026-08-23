#!/bin/sh
# Source-sync sidecar entrypoint (PID 1).
#
# Runs a local mutagen one-way-replica session /src -> /workspace that honors
# the root .gitignore, then keeps the mutagen daemon alive by streaming the
# session monitor. Idempotent: re-runs (container recreate / `docker restart`)
# terminate any prior session of the same name and recreate it against the warm
# volume, so the re-flush is a fast no-op diff.
set -eu

export HOME=/tmp
export MUTAGEN_DATA_DIRECTORY=/tmp/.mutagen
mkdir -p "$MUTAGEN_DATA_DIRECTORY"

SESSION="rome"
SRC=/src
DST=/workspace
READY=/tmp/.rome-sync-ready

# Clear the readiness marker before doing anything: /tmp lives in the container's
# writable layer and survives an in-place `docker restart` (or a restart:
# unless-stopped auto-restart after a crash). A stale marker would flip the
# healthcheck green before this run's mutagen flush completes, letting dev-up's
# `up --wait` / the backend start against not-yet-synced source. Re-create it only
# after the flush below.
rm -f "$READY"

# Some Go stdlib paths call user.Current(), which fails for a uid with no passwd
# entry. /etc/passwd is world-writable (Dockerfile); add an entry if missing.
uid="$(id -u)"
gid="$(id -g)"
if ! grep -q ":x:${uid}:" /etc/passwd 2>/dev/null; then
  echo "rome:x:${uid}:${gid}:rome:/tmp:/bin/sh" >>/etc/passwd 2>/dev/null || true
fi

# Derive mutagen ignores from the synced root .gitignore: git is the single
# source of truth for "what is source"; the rome container owns all generated
# state (node_modules, dist, .next, …) which .gitignore already lists, so those
# never sync in. Always ignore .git (a worktree's .git is an unsyncable pointer)
# and re-include .env* (gitignored secrets some apps read from disk).
set --
if [ -f "$SRC/.gitignore" ]; then
  while IFS= read -r line || [ -n "$line" ]; do
    case "$line" in "" | \#*) continue ;; esac
    set -- "$@" --ignore "$line"
  done <"$SRC/.gitignore"
fi
set -- "$@" --ignore ".git" --ignore "!.env" --ignore "!.env.*"

echo "rome-sync: (re)creating mutagen session '${SESSION}' (${SRC} -> ${DST}, one-way-replica)"
mutagen sync terminate "$SESSION" >/dev/null 2>&1 || true
# /src is bind-mounted read-only, so mutagen's default scan can't write its
# executability/normalization probe file into the root and the alpha scan dies
# with "read-only file system". assume-probe skips that write and infers POSIX
# behavior — correct here since alpha is always a Linux bind mount.
mutagen sync create --name "$SESSION" --sync-mode=one-way-replica \
  --probe-mode-alpha=assume "$@" "$SRC" "$DST"

echo "rome-sync: waiting for initial flush ..."
mutagen sync flush "$SESSION"
: >"$READY"
echo "rome-sync: initial sync complete — watching for changes"

# Keep PID 1 (and the mutagen daemon) alive; stream status to `docker logs`.
exec mutagen sync monitor "$SESSION"

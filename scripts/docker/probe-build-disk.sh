#!/usr/bin/env bash
set -euo pipefail

# Samples runner disk while the publish image builds, and reports the peak.
#
# The amd64 leg has twice died of ENOSPC, and that failure destroys its own
# evidence: the runner is killed before it uploads the job log, so the log
# blob 404s and no `if: always()` step ever runs. Nothing can autopsy the
# crash after the fact. So this measures the runs that survive — every arm64
# leg, and any amd64 leg on the test workflow — to establish how much disk
# the build actually appetites and how close the surviving legs come.
#
# Sampled rather than read once at the end, because the end is not the
# interesting moment: buildkit frees intermediate state as it goes, so the
# reading after the build sits far below the high-water mark that decides
# whether the job lives.
#
# Usage:
#   probe-build-disk.sh start    # background sampler; call before the build
#   probe-build-disk.sh report   # stop, print the series and the peak

PROBE_LOG=${PROBE_LOG:-/tmp/build-disk-probe.tsv}
PROBE_PID=${PROBE_PID:-/tmp/build-disk-probe.pid}
PROBE_INTERVAL=${PROBE_INTERVAL:-10}

# The filesystem docker builds on. /mnt is a separate 14GB temp disk and is
# not where /var/lib/docker lives, so / is the number that matters.
PROBE_MOUNT=${PROBE_MOUNT:-/}

start_probe() {
  : >"$PROBE_LOG"
  printf 'epoch\tused_bytes\tavail_bytes\n' >>"$PROBE_LOG"

  # A sampler that dies mid-build would silently truncate the series, so every
  # reading tolerates failure and the loop keeps going.
  nohup bash -c '
    while true; do
      if row=$(df -B1 --output=used,avail "'"$PROBE_MOUNT"'" 2>/dev/null | tail -1); then
        printf "%s\t%s\t%s\n" "$(date +%s)" $row >>"'"$PROBE_LOG"'" 2>/dev/null || true
      fi
      sleep "'"$PROBE_INTERVAL"'"
    done
  ' >/dev/null 2>&1 &

  echo $! >"$PROBE_PID"
  echo "probe-build-disk: sampling $PROBE_MOUNT every ${PROBE_INTERVAL}s -> $PROBE_LOG"
  df -h "$PROBE_MOUNT"
}

report_probe() {
  if [[ -f $PROBE_PID ]]; then
    kill "$(cat "$PROBE_PID")" 2>/dev/null || true
    rm -f "$PROBE_PID"
  fi

  if [[ ! -s $PROBE_LOG ]]; then
    echo "probe-build-disk: no samples recorded"
    return 0
  fi

  echo "probe-build-disk: disk over the build"
  awk -F'\t' 'NR == 1 { next }
    {
      gib = 1073741824
      if (start == 0) start = $1
      if (min_avail == 0 || $3 < min_avail) { min_avail = $3; peak_at = $1 - start }
      if ($2 > max_used) max_used = $2
      first_avail = (first_avail == 0 ? $3 : first_avail)
      n++
    }
    END {
      if (n == 0) { print "  (no samples)"; exit }
      printf "  samples          %d over %ds\n", n, $1 - start
      printf "  avail at start   %.2f GiB\n", first_avail / gib
      printf "  avail at floor   %.2f GiB  (t+%ds)\n", min_avail / gib, peak_at
      printf "  peak used        %.2f GiB\n", max_used / gib
      printf "  build consumed   %.2f GiB\n", (first_avail - min_avail) / gib
    }' "$PROBE_LOG"

  echo
  echo "probe-build-disk: buildkit cache"
  docker buildx du 2>/dev/null | tail -5 || echo "  (buildx du unavailable)"

  echo
  echo "probe-build-disk: docker images and volumes"
  docker system df 2>/dev/null || echo "  (docker system df unavailable)"
}

case "${1:-}" in
  start) start_probe ;;
  report) report_probe ;;
  *)
    echo "usage: ${BASH_SOURCE[0]} {start|report}" >&2
    exit 2
    ;;
esac

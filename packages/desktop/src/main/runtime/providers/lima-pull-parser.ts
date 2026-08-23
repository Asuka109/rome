import { createLogger } from "../../logger";
import type { RuntimePullProgress } from "../provider";

const log = createLogger("runtime:lima:pull-parser");

type LayerStatus =
  | "resolving"
  | "resolved"
  | "waiting"
  | "downloading"
  | "done"
  | "committing"
  | "error"
  | "exists"
  | "unpacking"
  | "pulling";

interface LayerState {
  status: LayerStatus;
  current: number;
  total: number;
}

export interface LayerTransition {
  ref: string;
  from: LayerStatus | null;
  to: LayerStatus;
}

const KNOWN_STATUSES = new Set<LayerStatus>([
  "resolving",
  "resolved",
  "waiting",
  "downloading",
  "done",
  "committing",
  "error",
  "exists",
  "unpacking",
  "pulling",
]);

// SI and binary prefixes are treated identically — 2.4% off at K, 10% at T,
// close enough for a progress bar. The forms without a trailing B are here
// because nerdctl emits them and both byte regexes capture `[KMGT]?i?B?`.
const UNITS: Record<string, number> = {
  "": 1,
  B: 1,
  K: 1024,
  Ki: 1024,
  KB: 1024,
  KiB: 1024,
  M: 1024 ** 2,
  Mi: 1024 ** 2,
  MB: 1024 ** 2,
  MiB: 1024 ** 2,
  G: 1024 ** 3,
  Gi: 1024 ** 3,
  GB: 1024 ** 3,
  GiB: 1024 ** 3,
  T: 1024 ** 4,
  Ti: 1024 ** 4,
  TB: 1024 ** 4,
  TiB: 1024 ** 4,
};

const STATUS_RE = /^(.+?):\s+([a-zA-Z]+)\b\s*(.*)$/;
const BYTES_RE = /(\d+(?:\.\d+)?)\s*([KMGT]?i?B?)?\s*\/\s*(\d+(?:\.\d+)?)\s*([KMGT]?i?B?)/;
// The `elapsed:` summary line carries the only honest cumulative byte count
// nerdctl 2.x emits during a pull — per-layer `downloading` lines always
// report `0.0 B/<total>` and only update on terminal status, which gives no
// intermediate progress. Format: `elapsed: 9.3 s ... total:  24.7 M (...)`.
const ELAPSED_TOTAL_RE = /\btotal:\s*(\d+(?:\.\d+)?)\s*([KMGT]?i?B?)\b/i;
// eslint-disable-next-line no-control-regex
const ANSI_RE = /\x1b\[[0-?]*[ -/]*[@-~]/g;

const warnedUnits = new Set<string>();
function resolveUnit(unit: string | undefined): number {
  if (unit == null) return 1;
  const direct = UNITS[unit];
  if (direct != null) return direct;
  const upper = UNITS[unit.toUpperCase()];
  if (upper != null) return upper;
  if (!warnedUnits.has(unit)) {
    warnedUnits.add(unit);
    log.warn(
      `unrecognised byte unit "${unit}" — treating as bytes; pull progress denominator may be off`,
    );
  }
  return 1;
}

/**
 * Parses nerdctl/containerd progress output line-by-line and produces a
 * RuntimePullProgress snapshot.
 *
 * Total bytes are computed dynamically as the sum of every observed
 * `layer-sha256:` blob's reported size — that figure converges to the real
 * image total within the first ~1 s of the pull (the time it takes nerdctl
 * to announce every layer, either as `downloading` or `waiting`). We
 * deliberately exclude the index, manifest, and config blobs from the
 * aggregate: those sha256-prefixed blobs are kilobyte-sized and finish
 * downloading well before any layer starts, which would otherwise let a
 * naive aggregator latch onto a few-KB total.
 *
 * Current bytes come from the periodic `elapsed: … total: X` summary line —
 * the only honest mid-pull byte counter nerdctl 2.x emits. The per-layer
 * `downloading` lines always report `0.0 B / <total>` regardless of actual
 * progress, so they only ever contribute the layer's announced size.
 *
 * Percent is also kept monotonically non-decreasing via a high-water mark —
 * the aggregated total briefly grows as new layers are announced, which
 * would otherwise let the bar tick backwards.
 */
export class PullProgressParser {
  private readonly layers = new Map<string, LayerState>();
  private completed = false;
  private highWaterPercent = 0;
  /**
   * Monotonic high-water mark of cumulative bytes transferred, sourced from
   * the periodic `elapsed:` summary line.
   */
  private cumulativeBytes = 0;
  /**
   * Once locked, this is what we divide currentBytes by to compute percent.
   * See `tryStabilize` for the sync point we wait on.
   */
  private stabilizedTotal: number | null = null;
  /**
   * Set true the first time a `layer-sha256:` ref reaches `done` / `exists`.
   * A layer can't reach a terminal status without first having appeared in
   * a prior snapshot tick, and containerd emits every job it knows about in
   * every tick — so by the time we see the first terminal layer, the entire
   * layer set has been announced in at least one previous tick and is in
   * our map. We then wait for the very next `elapsed:` line (a snapshot-tick
   * boundary) before reading the aggregate, which guarantees we don't snap
   * to a partial sum from a mid-tick race.
   */
  private firstLayerDoneSeen = false;

  /**
   * Marks the pull as finished — the snapshot will report phase=done and
   * percent=100 regardless of the last layer's status. Called by the spawn
   * driver right before resolving.
   */
  markComplete(): void {
    this.completed = true;
    this.highWaterPercent = 100;
  }

  /**
   * Ingest a single line of output. Returns a transition descriptor when a
   * layer's status word actually changed (callers may log it); returns null
   * for repeat snapshots, byte-only updates, summary lines (`elapsed:` /
   * `total:`), or anything unparseable.
   */
  ingest(rawLine: string): LayerTransition | null {
    const line = rawLine.replace(ANSI_RE, "").trim();
    if (!line) return null;
    if (line.startsWith("elapsed:")) {
      const m = ELAPSED_TOTAL_RE.exec(line);
      if (m) {
        const [, n, unit] = m;
        const factor = resolveUnit(unit);
        const bytes = Math.round(parseFloat(n) * factor);
        if (bytes > this.cumulativeBytes) this.cumulativeBytes = bytes;
      }
      // First elapsed-tick after the first layer reached done = safe sync
      // point to lock the total. By here, every line of the snapshot that
      // contained that done has been processed and all peer layers are in
      // our map.
      if (this.stabilizedTotal == null && this.firstLayerDoneSeen) {
        let aggregate = 0;
        for (const [ref, layer] of this.layers) {
          if (isLayerRef(ref)) aggregate += layer.total;
        }
        if (aggregate > 0) this.stabilizedTotal = aggregate;
      }
      this.updateHighWater();
      return null;
    }

    const match = STATUS_RE.exec(line);
    if (!match) return null;
    const [, refRaw, statusRaw, tail] = match;
    const status = statusRaw.toLowerCase() as LayerStatus;
    if (!KNOWN_STATUSES.has(status)) return null;
    const ref = refRaw.trim();
    if (!ref) return null;

    let current = 0;
    let total = 0;
    const bytes = BYTES_RE.exec(tail);
    if (bytes) {
      const [, curN, curU, totN, totU] = bytes;
      const totalUnit = resolveUnit(totU);
      const currentUnit = curU ? resolveUnit(curU) : totalUnit;
      current = Math.round(parseFloat(curN) * currentUnit);
      total = Math.round(parseFloat(totN) * totalUnit);
    }

    const existing = this.layers.get(ref);
    const isTerminal = status === "done" || status === "exists";
    // `done` lines often drop the byte counter — preserve the last-known
    // totals so the aggregate doesn't regress when a layer finishes.
    // While `downloading`, never let a layer's current shrink (containerd
    // can momentarily reset on rebuffer); same protection for `total`.
    const nextCurrent = isTerminal
      ? Math.max(current, existing?.total ?? 0, existing?.current ?? 0)
      : Math.max(current, existing?.current ?? 0);
    const nextTotal = Math.max(total, existing?.total ?? 0);

    if (
      existing &&
      existing.status === status &&
      existing.current === nextCurrent &&
      existing.total === nextTotal
    ) {
      return null;
    }

    const previousStatus = existing?.status ?? null;
    this.layers.set(ref, { status, current: nextCurrent, total: nextTotal });
    if (isTerminal && isLayerRef(ref) && previousStatus !== "done" && previousStatus !== "exists") {
      this.firstLayerDoneSeen = true;
    }
    this.updateHighWater();
    if (previousStatus === status) return null;
    return { ref, from: previousStatus, to: status };
  }

  /**
   * Recompute the percent high-water mark from current state. Called at the
   * end of any ingest() path that may have changed layers, cumulativeBytes,
   * or stabilizedTotal. Kept in ingest() (not snapshot()) so snapshot() stays
   * a pure read.
   */
  private updateHighWater(): void {
    if (this.stabilizedTotal == null || this.stabilizedTotal <= 0) return;
    let aggregatedCurrent = 0;
    for (const [ref, layer] of this.layers) {
      if (isLayerRef(ref)) aggregatedCurrent += layer.current;
    }
    const currentBytes = Math.min(
      Math.max(aggregatedCurrent, this.cumulativeBytes),
      this.stabilizedTotal,
    );
    const raw = (currentBytes / this.stabilizedTotal) * 100;
    if (raw > this.highWaterPercent) this.highWaterPercent = raw;
  }

  snapshot(): RuntimePullProgress {
    let aggregatedCurrent = 0;
    let aggregatedTotal = 0;
    let downloaded = 0;
    let unpacking = 0;
    let observedBlobs = 0;
    for (const [ref, layer] of this.layers) {
      if (!isLayerRef(ref)) continue;
      observedBlobs += 1;
      aggregatedCurrent += layer.current;
      aggregatedTotal += layer.total;
      if (layer.status === "done" || layer.status === "exists") downloaded += 1;
      if (layer.status === "unpacking" || layer.status === "committing") unpacking += 1;
    }

    // totalBytes for display purposes — the live aggregate until we hit
    // the sync point in ingest(), then locked to stabilizedTotal.
    const totalBytes = this.stabilizedTotal ?? aggregatedTotal;
    // aggregatedCurrent is step-wise (jumps when each layer flips to done).
    // cumulativeBytes is smooth (updated every ~100ms by the elapsed line).
    // Use whichever is larger — they only diverge when one source is ahead.
    const currentBytes =
      totalBytes > 0
        ? Math.min(Math.max(aggregatedCurrent, this.cumulativeBytes), totalBytes)
        : Math.max(aggregatedCurrent, this.cumulativeBytes);
    const layersTotal = observedBlobs;
    const layersCompleted = downloaded;

    if (this.completed) {
      return {
        phase: "done",
        percent: 100,
        status: "Done",
        currentBytes: totalBytes,
        totalBytes,
        layersCompleted: layersTotal,
        layersTotal,
      };
    }

    // Unpacking: explicit `unpacking`/`committing` lines OR we've received
    // essentially all the bytes the pull will transfer and every observed
    // layer has terminated downloading. Both legs require a stabilized
    // total — without it, "98% of total" would fire on a partial sum.
    const bytesReached =
      this.stabilizedTotal != null && currentBytes >= this.stabilizedTotal * 0.98;
    const allObservedDone = observedBlobs > 0 && downloaded >= observedBlobs;
    const inUnpackingPhase = unpacking > 0 || (bytesReached && allObservedDone);

    if (inUnpackingPhase) {
      // Switch to indeterminate so the bar doesn't look frozen at 100%.
      return {
        phase: "unpacking",
        percent: null,
        status: "Unpacking layers",
        currentBytes,
        totalBytes,
        layersCompleted,
        layersTotal,
      };
    }

    let percent: number | null = null;
    // Only compute a percent once the total has settled — otherwise the
    // bar locks against an early partial sum.
    if (this.stabilizedTotal != null && this.stabilizedTotal > 0) {
      const raw = Math.min(100, (currentBytes / this.stabilizedTotal) * 100);
      percent = Math.max(raw, this.highWaterPercent);
    }
    const status =
      observedBlobs === 0
        ? "Preparing image download"
        : this.stabilizedTotal == null
          ? "Starting download"
          : "Downloading";
    return {
      phase: "downloading",
      percent,
      status,
      currentBytes,
      totalBytes,
      layersCompleted,
      layersTotal,
    };
  }
}

/**
 * Only real image layers count toward the totals we surface. The index,
 * manifest, and config blobs also carry `sha256:` digests but each is just
 * a few KB and they all complete before any layer starts downloading — if
 * we counted them, the parser would briefly observe "all known blobs done,
 * none waiting" while the actual layers haven't been emitted yet, locking
 * the calibrated total to a few KB.
 */
function isLayerRef(ref: string): boolean {
  return ref.startsWith("layer-sha256:");
}

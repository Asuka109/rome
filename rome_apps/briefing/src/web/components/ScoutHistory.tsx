import { useEffect, useMemo, useState } from "react";
import { fetchAppApi } from "@rome-os/app-web-sdk";
import { AlertCircle, CheckCircle2, CircleSlash, Hand, Loader2 } from "lucide-react";
import { Markdown } from "./Markdown";
import { StatusBadge } from "./StatusBadge";
import { dayLabel, timeLabel } from "../lib/format";
import type { ScoutResultDto } from "../lib/types";
import { cn } from "@/lib/utils";

/**
 * Run history for one scout: a day-grouped timeline of every recorded run
 * (completed, skipped, failed, running) with a detail pane for the selected
 * run. Skipped runs — the assistant checked and found nothing new — stay in
 * the timeline, clearly marked, so "no news" is visible rather than silent.
 */
export function ScoutHistory({ scoutId }: { scoutId: string }) {
  const [results, setResults] = useState<ScoutResultDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetchAppApi(`scouts/${scoutId}/results`);
        if (!res.ok) throw new Error(`Failed to load run history (${res.status})`);
        const data = (await res.json()) as { results: ScoutResultDto[] };
        if (cancelled) return;
        setResults(data.results);
        setError(null);
        // Preselect the most recent run that has something to read.
        setSelectedId(
          (prev) =>
            prev ??
            (data.results.find((r) => r.status === "completed") ?? data.results[0])?.id ??
            null,
        );
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [scoutId]);

  const days = useMemo(() => {
    const groups: { label: string; items: ScoutResultDto[] }[] = [];
    for (const r of results ?? []) {
      const label = dayLabel(r.startedAt);
      const last = groups[groups.length - 1];
      if (last && last.label === label) last.items.push(r);
      else groups.push({ label, items: [r] });
    }
    return groups;
  }, [results]);

  if (error) {
    return <p className="rounded-8 border bg-muted/40 p-3 text-sm text-destructive">{error}</p>;
  }
  if (results === null) {
    return (
      <p className="flex items-center gap-2 rounded-8 border bg-muted/40 p-3 text-sm text-muted-foreground">
        <Loader2 className="size-3.5 animate-spin" /> Loading run history…
      </p>
    );
  }
  if (results.length === 0) {
    return (
      <p className="rounded-8 border bg-muted/40 p-3 text-sm text-muted-foreground">
        No runs yet — use ▶ to run this scout now.
      </p>
    );
  }

  const selected = results.find((r) => r.id === selectedId) ?? null;

  return (
    <div className="grid gap-3 rounded-8 border bg-muted/40 p-3 md:grid-cols-[220px_minmax(0,1fr)]">
      {/* timeline */}
      <div className="max-h-72 space-y-2 overflow-y-auto pr-1 md:max-h-96">
        {days.map((day) => (
          <div key={day.label}>
            <p className="sticky top-0 bg-transparent px-1 pb-1 text-aux uppercase text-muted-foreground backdrop-blur-sm">
              {day.label}
            </p>
            <div className="space-y-1">
              {day.items.map((r) => (
                <RunRow
                  key={r.id}
                  result={r}
                  active={r.id === selectedId}
                  onSelect={() => setSelectedId(r.id)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* detail */}
      <div className="min-w-0 rounded-8 border bg-background p-3">
        {selected ? <RunDetail result={selected} /> : null}
      </div>
    </div>
  );
}

const RUN_ICON: Record<string, { Icon: typeof CheckCircle2; className: string }> = {
  completed: { Icon: CheckCircle2, className: "text-emerald-600" },
  skipped: { Icon: CircleSlash, className: "text-muted-foreground" },
  failed: { Icon: AlertCircle, className: "text-destructive" },
  pending: { Icon: Loader2, className: "animate-spin text-amber-600" },
};

function RunRow({
  result,
  active,
  onSelect,
}: {
  result: ScoutResultDto;
  active: boolean;
  onSelect: () => void;
}) {
  const { Icon, className } = RUN_ICON[result.status] ?? RUN_ICON.pending;
  const skipped = result.status === "skipped";
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex w-full items-center gap-2 rounded-8 px-2 py-1.5 text-left text-xs transition-colors",
        active ? "bg-background shadow-1" : "hover:bg-background/60",
        skipped && !active && "opacity-70",
      )}
    >
      <Icon className={cn("size-3.5 shrink-0", className)} />
      <span className="shrink-0 tabular-nums text-foreground">{timeLabel(result.startedAt)}</span>
      <span className={cn("min-w-0 truncate text-muted-foreground", skipped && "italic")}>
        {result.status === "completed"
          ? "findings"
          : skipped
            ? "skipped — no findings"
            : result.status === "failed"
              ? "failed"
              : "running…"}
      </span>
      {result.trigger === "manual" && (
        <Hand className="ml-auto size-3 shrink-0 text-muted-foreground" aria-label="Manual run" />
      )}
    </button>
  );
}

function RunDetail({ result }: { result: ScoutResultDto }) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2 border-b pb-2 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">
          {dayLabel(result.startedAt)} · {timeLabel(result.startedAt)}
        </span>
        <StatusBadge status={result.status} />
        {result.trigger === "manual" && <span>manual run</span>}
        {result.consumedAt && <span>· woven into a brief</span>}
      </div>
      {result.status === "skipped" ? (
        <p className="flex items-center gap-2 py-4 text-sm italic text-muted-foreground">
          <CircleSlash className="size-4" /> The scout ran and found nothing new — this turn was
          skipped.
        </p>
      ) : result.status === "failed" ? (
        <p className="text-sm text-destructive">{result.error ?? "The run failed."}</p>
      ) : result.content ? (
        <div className="max-h-80 overflow-y-auto pr-1">
          <Markdown content={result.content} />
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Still running…</p>
      )}
    </div>
  );
}

import { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { Check, Loader2, Plus, Radar, SkipForward, TriangleAlert } from "lucide-react";
import { defineComponent, type AppComponentContext } from "@rome-os/app-web-sdk";
import { Button } from "@rome-os/ui/button";
import { cn } from "@/lib/utils";

interface ScoutSuggestion {
  title: string;
  prompt: string;
  intervalMinutes: number;
  reason: string;
}

type AddState =
  | { kind: "idle" }
  | { kind: "adding" }
  | { kind: "added" }
  | { kind: "error"; message: string };

function readScouts(value: unknown): ScoutSuggestion[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const scout = item as Partial<ScoutSuggestion>;
    if (
      typeof scout.title !== "string" ||
      typeof scout.prompt !== "string" ||
      typeof scout.reason !== "string" ||
      typeof scout.intervalMinutes !== "number"
    ) {
      return [];
    }
    return [
      {
        title: scout.title,
        prompt: scout.prompt,
        reason: scout.reason,
        intervalMinutes: scout.intervalMinutes,
      },
    ];
  });
}

function intervalLabel(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  if (minutes % 1440 === 0) return minutes === 1440 ? "Daily" : `Every ${minutes / 1440} days`;
  if (minutes % 60 === 0) return `Every ${minutes / 60}h`;
  return `${minutes} min`;
}

async function addScout(scout: ScoutSuggestion): Promise<string | null> {
  const res = await fetch("/api/apps/briefing/scouts", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: scout.title,
      prompt: scout.prompt,
      intervalMinutes: scout.intervalMinutes,
      enabled: true,
    }),
  });
  if (res.ok) return null;
  const body = (await res.json().catch(() => null)) as { error?: string } | null;
  return body?.error ?? `Could not add this scout (${res.status}).`;
}

function ScoutSuggestions({ ctx }: { ctx: AppComponentContext }) {
  const scouts = readScouts(ctx.props.scouts);
  const resolved = ctx.host.resolved;
  const resolvedAdded = Array.isArray(ctx.result?.addedTitles)
    ? ctx.result.addedTitles.filter((title): title is string => typeof title === "string")
    : [];
  const initialStates = useMemo(
    () =>
      Object.fromEntries(
        scouts.map((scout) => [
          scout.title,
          resolvedAdded.includes(scout.title)
            ? { kind: "added" as const }
            : { kind: "idle" as const },
        ]),
      ),
    [resolvedAdded, scouts],
  );
  const [states, setStates] = useState<Record<string, AddState>>(initialStates);

  const addedTitles = scouts
    .filter((scout) => states[scout.title]?.kind === "added")
    .map((scout) => scout.title);
  const busy = Object.values(states).some((state) => state.kind === "adding");

  const add = async (scout: ScoutSuggestion) => {
    if (
      resolved ||
      states[scout.title]?.kind === "adding" ||
      states[scout.title]?.kind === "added"
    ) {
      return;
    }
    setStates((prev) => ({ ...prev, [scout.title]: { kind: "adding" } }));
    const error = await addScout(scout);
    setStates((prev) => ({
      ...prev,
      [scout.title]: error ? { kind: "error", message: error } : { kind: "added" },
    }));
  };

  const continueOn = () => {
    const count = addedTitles.length;
    ctx.host.submit(
      { addedTitles },
      count === 0
        ? "Skipped briefing scouts"
        : `Added ${count} briefing scout${count === 1 ? "" : "s"}`,
    );
  };

  if (resolved) {
    return (
      <div className="w-full max-w-md rounded-12 border border-border bg-card p-4">
        <p className="text-sm font-medium text-foreground">
          {resolvedAdded.length > 0 ? "Briefing scouts added" : "Briefing scouts skipped"}
        </p>
        {resolvedAdded.length > 0 ? (
          <ul className="mt-2 space-y-1.5 text-xs text-muted-foreground">
            {resolvedAdded.map((title) => (
              <li key={title} className="flex items-center gap-1.5">
                <Check className="size-3.5 text-primary" />
                {title}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-1.5 text-xs text-muted-foreground">
            You can add scouts later from the Briefing app.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="w-full max-w-md space-y-3">
      <div>
        <p className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Radar className="size-4 text-primary" aria-hidden />
          Add scouts to your briefing
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          These run in the background and roll useful findings into your morning and evening briefs.
        </p>
      </div>

      <div className="space-y-2">
        {scouts.map((scout) => {
          const state = states[scout.title] ?? { kind: "idle" };
          const isAdded = state.kind === "added";
          return (
            <div
              key={scout.title}
              className={cn(
                "rounded-12 border bg-card p-3 transition-colors",
                isAdded ? "border-primary/40 bg-primary/[0.04]" : "border-border",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">{scout.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {scout.reason} • {intervalLabel(scout.intervalMinutes)}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant={isAdded ? "outline" : "default"}
                  disabled={busy || isAdded}
                  onClick={() => void add(scout)}
                >
                  {state.kind === "adding" ? (
                    <Loader2 className="size-3.5 animate-spin" aria-hidden />
                  ) : isAdded ? (
                    <Check className="size-3.5" aria-hidden />
                  ) : (
                    <Plus className="size-3.5" aria-hidden />
                  )}
                  {state.kind === "adding" ? "Adding" : isAdded ? "Added" : "Add"}
                </Button>
              </div>
              <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-muted-foreground">
                {scout.prompt}
              </p>
              {state.kind === "error" ? (
                <p className="mt-2 flex items-center gap-1.5 text-xs text-destructive">
                  <TriangleAlert className="size-3.5" aria-hidden />
                  {state.message}
                </p>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="flex justify-end">
        <Button
          variant={addedTitles.length > 0 ? "default" : "ghost"}
          size="sm"
          disabled={busy}
          onClick={continueOn}
        >
          {addedTitles.length > 0 ? (
            <>
              <Check className="size-3.5" aria-hidden />
              Continue
            </>
          ) : (
            <>
              <SkipForward className="size-3.5" aria-hidden />
              Skip for now
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

defineComponent("scout-suggestions", (container, ctx) => {
  const root = createRoot(container);
  root.render(<ScoutSuggestions ctx={ctx} />);
  return () => root.unmount();
});

import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { appApiUrl, getTrace, type TraceDetail } from "../lib/api.js";
import { CollapsedTraceButton } from "../vendor/rome-core/AgentTrace.js";
import { ShowcaseTraceDrawer } from "../components/ShowcaseTraceDrawer.js";
import { Markdown } from "../components/Markdown.js";
import { deriveFinalMessage, deriveUserPrompt } from "../trace/derive.js";

export function ChatReplica({
  traceId,
  navigate,
}: {
  traceId: string;
  navigate: (hash: string) => void;
}) {
  const [trace, setTrace] = useState<TraceDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setDrawerOpen(false);
    getTrace(traceId)
      .then((t) => {
        if (!cancelled) setTrace(t);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [traceId]);

  const prompt = trace ? deriveUserPrompt(trace.snapshot, trace.metadata) : null;
  const finalMessage = trace ? deriveFinalMessage(trace.snapshot) : null;

  return (
    <div className="flex h-full min-h-0 w-full overflow-hidden">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-border px-4 py-3">
          <button
            type="button"
            onClick={() => navigate("#/")}
            className="inline-flex h-8 w-8 items-center justify-center rounded-8 text-muted-foreground hover:bg-surface-muted hover:text-foreground"
            aria-label="Back to gallery"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="min-w-0">
            <h1 className="truncate text-sm font-semibold text-foreground">
              {trace?.title ?? "Trace"}
            </h1>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-3xl px-4 py-6">
            {loading && <div className="text-sm text-muted-foreground">Loading trace…</div>}
            {error && (
              <div className="rounded-8 border border-destructive-border bg-destructive-bg px-3 py-2 text-sm text-destructive-fg">
                {error}
              </div>
            )}

            {trace && (
              <div className="space-y-6">
                {prompt && (
                  <div className="flex justify-end">
                    <div className="max-w-[80%] whitespace-pre-wrap rounded-16 rounded-br-4 bg-surface-muted px-4 py-2.5 text-sm text-foreground">
                      {prompt}
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  <CollapsedTraceButton
                    summary={trace.summary}
                    onClick={() => setDrawerOpen(true)}
                  />
                  {finalMessage ? (
                    <div className="text-sm text-foreground">
                      <Markdown content={finalMessage} />
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">
                      This turn produced no final text message. Open the trace to see the steps.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {trace && (
        <ShowcaseTraceDrawer
          open={drawerOpen}
          summary={trace.summary}
          segments={trace.snapshot.segments}
          rawHref={appApiUrl(`traces/${trace.id}/raw.json`)}
          onClose={() => setDrawerOpen(false)}
        />
      )}
    </div>
  );
}

import { useEffect, useState } from "react";
import { ArrowLeft, Play, Sparkles } from "lucide-react";
import {
  appApiUrl,
  fetchRemoteBundle,
  getSession,
  type SessionDetail,
  type TraceDetail,
} from "../lib/api.js";
import type { ShowcaseBundle } from "../../trace/portable.js";
import { buildTraceSnapshot } from "../../trace/build-snapshot.js";
import { CollapsedTraceButton } from "../vendor/rome-core/AgentTrace.js";
import { MessageRow } from "../vendor/rome-core/MessageRow.js";
import { RomeAvatar } from "../vendor/rome-core/RomeAvatar.js";
import { ShowcaseTraceDrawer } from "../components/ShowcaseTraceDrawer.js";
import { Markdown } from "../components/Markdown.js";
import { ReplayInteractionCard } from "../components/ReplayInteractionCard.js";
import { deriveFinalMessage, deriveUserPrompt } from "../trace/derive.js";
import type { ReplyBlock } from "../../trace/types.js";

// Conversation blocks captured at import for turns that surfaced an interaction
// card. Rendered in the agent body to mirror /chat; absent for text-only turns.
function replyBlocksOf(metadata: Record<string, unknown>): ReplyBlock[] {
  const raw = metadata.replyBlocks;
  return Array.isArray(raw) ? (raw as ReplyBlock[]) : [];
}

// Turn a (cloud) bundle into the same shape SessionReplica renders, entirely in
// memory — shared cases are streamed from Rome Cloud and never persisted
// locally. The bundle already carries each trace's snapshot/summary; we only
// rebuild a snapshot as a defensive fallback for older exports.
function bundleToTurns(bundle: ShowcaseBundle): { title: string | null; turns: TraceDetail[] } {
  const turns: TraceDetail[] = [];
  for (const collection of bundle.collections) {
    for (const trace of collection.traces) {
      const snapshot =
        trace.snapshot ?? buildTraceSnapshot({ idPrefix: trace.id, blocks: trace.blocks });
      turns.push({
        id: trace.id,
        collectionId: collection.id,
        title: trace.title,
        description: trace.description ?? null,
        capturedAt: trace.capturedAt,
        summary: trace.summary ?? snapshot.summary,
        metadata: (trace.metadata ?? {}) as Record<string, unknown>,
        blocks: trace.blocks,
        snapshot,
        inputTokens: null,
        outputTokens: null,
        cacheReadTokens: null,
        cacheWriteTokens: null,
        costUsd: null,
      });
    }
  }
  return { title: bundle.collections[0]?.title ?? null, turns };
}

// The agent that ran a turn, for the MessageRow header — mirrors the chat
// transcript's avatar + name. The turn avatar represents the *agent* that owns
// the turn, not the tools it called: the live transcript shows Rome's mark for a
// top-level turn and surfaces per-tool app icons only inside the trace. A run
// segment's `app` is the *tool's* app (e.g. the coding app's `>_`), so it must
// never drive the turn avatar — for the core "Rome" agent we return no icon and
// let TurnAvatar render the Rome mark. (An app sub-agent, rare at the top level,
// keeps its run app icon as a best-effort stand-in.)
function turnAgent(turn: TraceDetail): { name: string; iconUrl: string | null } {
  for (const seg of turn.snapshot.segments) {
    if (seg.kind !== "run" && seg.kind !== "block") continue;
    const isCore = !seg.agent || seg.agent === "main";
    // The core guardian agent is surfaced as "Assistant" (the product-facing
    // name), not its internal "Rome"/"main" id; app sub-agents keep their name.
    const iconUrl = isCore ? null : seg.kind === "run" ? (seg.app?.iconUrl ?? null) : null;
    return { name: isCore ? "Assistant" : seg.agentDisplayName, iconUrl };
  }
  return { name: "Assistant", iconUrl: null };
}

// Rounded-square avatar tile mirroring the chat page's AgentAvatar: the agent's
// app icon when one is known, otherwise the Rome mark (the same robot avatar the
// live transcript shows for core "Rome" turns).
function TurnAvatar({ iconUrl, label }: { iconUrl: string | null; label: string }) {
  if (iconUrl) {
    return (
      <span className="inline-flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-8 bg-surface-muted">
        <img src={iconUrl} alt={label} className="size-full rounded-8 object-cover" />
      </span>
    );
  }
  return <RomeAvatar className="size-8 shrink-0 rounded-8" aria-hidden />;
}

// Pure render of a multi-turn replay. Data-source agnostic: the local route
// feeds it from the app DB, the shared route feeds it from a cloud bundle.
// `rawHrefFor` is omitted for cloud cases (no local raw.json endpoint exists).
function SessionReplicaView({
  title,
  turns,
  loading,
  error,
  navigate,
  rawHrefFor,
  sourceLabel,
}: {
  title: string | null;
  turns: TraceDetail[];
  loading: boolean;
  error: string | null;
  navigate: (hash: string) => void;
  rawHrefFor?: (traceId: string) => string | undefined;
  sourceLabel: string;
}) {
  const [openTurn, setOpenTurn] = useState<number | null>(null);
  const activeTurn: TraceDetail | null =
    openTurn !== null && turns[openTurn] ? turns[openTurn] : null;
  const traceCount = turns.length;

  return (
    <div className="flex h-full min-h-0 w-full overflow-hidden bg-background">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="border-b border-border bg-surface px-4 py-3 shadow-1">
          <div className="mx-auto flex w-full max-w-6xl items-center gap-3">
            <button
              type="button"
              onClick={() => navigate("#/cases")}
              className="inline-flex h-8 w-8 items-center justify-center rounded-8 text-muted-foreground hover:bg-surface-muted hover:text-foreground"
              aria-label="Back to cases"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-8 bg-surface-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                  <Sparkles size={12} /> {sourceLabel}
                </span>
                {traceCount > 0 ? (
                  <span className="inline-flex items-center gap-1.5 rounded-8 border border-border bg-background px-2 py-0.5 text-xs text-muted-foreground">
                    <Play size={12} /> {traceCount} turn{traceCount === 1 ? "" : "s"}
                  </span>
                ) : null}
              </div>
              <h1 className="truncate text-base font-semibold text-foreground">
                {title ?? "Session"}
              </h1>
            </div>
          </div>
        </header>

        <div className="flex min-h-0 flex-1 overflow-hidden">
          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 lg:py-8">
              {loading && (
                <div className="rounded-12 border border-border bg-surface px-4 py-3 text-sm text-muted-foreground shadow-1">
                  Loading session…
                </div>
              )}
              {error && (
                <div className="rounded-12 border border-destructive-border bg-destructive-bg px-4 py-3 text-sm text-destructive-fg shadow-1">
                  {error}
                </div>
              )}

              {!loading && !error && turns.length === 0 && (
                <div className="rounded-12 border border-dashed border-border bg-surface p-10 text-center text-sm text-muted-foreground">
                  This session has no turns.
                </div>
              )}

              {!loading && !error && turns.length > 0 && (
                <div className="space-y-8">
                  {turns.map((turn, index) => {
                    const prompt = deriveUserPrompt(turn.snapshot, turn.metadata);
                    const finalMessage = deriveFinalMessage(turn.snapshot);
                    const replyBlocks = replyBlocksOf(turn.metadata);
                    const agent = turnAgent(turn);
                    return (
                      <div key={turn.id}>
                        {/* Guardian's prompt — right-aligned bubble, matching the
                            chat page's UserMessage. */}
                        {prompt && (
                          <div className="mb-4 flex justify-end">
                            <div className="max-w-[70%] break-words rounded-12 bg-surface-muted px-4 py-2.5 text-sm text-foreground">
                              <div className="whitespace-pre-wrap">{prompt}</div>
                            </div>
                          </div>
                        )}

                        {/* Agent turn — same MessageRow (avatar + name + trace
                            subtitle + reply body) the chat transcript uses. */}
                        <MessageRow
                          avatar={<TurnAvatar iconUrl={agent.iconUrl} label={agent.name} />}
                          name={agent.name}
                          subtitle={
                            <CollapsedTraceButton
                              summary={turn.summary}
                              onClick={() => setOpenTurn(index)}
                            />
                          }
                        >
                          {replyBlocks.length > 0 ? (
                            // Faithful to /chat: render the agent's reply text and
                            // any interaction card inline, in order.
                            <div className="space-y-3 text-sm text-foreground">
                              {replyBlocks.map((block, i) =>
                                block.type === "text" ? (
                                  <Markdown key={i} content={block.content} />
                                ) : (
                                  <ReplayInteractionCard key={block.toolUseId || i} block={block} />
                                ),
                              )}
                            </div>
                          ) : finalMessage ? (
                            <div className="text-sm text-foreground">
                              <Markdown content={finalMessage} />
                            </div>
                          ) : (
                            <div className="text-sm text-muted-foreground">
                              This turn produced no final text message. Open the trace to see the
                              steps.
                            </div>
                          )}
                        </MessageRow>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {!loading && !error && activeTurn && (
        <ShowcaseTraceDrawer
          open={openTurn !== null}
          summary={activeTurn.summary}
          segments={activeTurn.snapshot.segments}
          rawHref={rawHrefFor?.(activeTurn.id)}
          onClose={() => setOpenTurn(null)}
        />
      )}
    </div>
  );
}

// Local replay: a collection persisted in the app DB.
export function SessionReplica({
  collectionId,
  navigate,
}: {
  collectionId: string;
  navigate: (hash: string) => void;
}) {
  const [session, setSession] = useState<SessionDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getSession(collectionId)
      .then((s) => {
        if (!cancelled) setSession(s);
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
  }, [collectionId]);

  return (
    <SessionReplicaView
      title={session?.collection.title ?? null}
      turns={session?.turns ?? []}
      loading={loading}
      error={error}
      navigate={navigate}
      rawHrefFor={(id) => appApiUrl(`traces/${id}/raw.json`)}
      sourceLabel="Local import"
    />
  );
}

// Shared replay: a case pack streamed from Rome Cloud, rendered in memory with
// no local copy.
export function SharedReplica({
  presetId,
  navigate,
}: {
  presetId: string;
  navigate: (hash: string) => void;
}) {
  const [data, setData] = useState<{ title: string | null; turns: TraceDetail[] }>({
    title: null,
    turns: [],
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchRemoteBundle(presetId)
      .then((bundle) => {
        if (!cancelled) setData(bundleToTurns(bundle));
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
  }, [presetId]);

  return (
    <SessionReplicaView
      title={data.title}
      turns={data.turns}
      loading={loading}
      error={error}
      navigate={navigate}
      sourceLabel="Shared case"
    />
  );
}

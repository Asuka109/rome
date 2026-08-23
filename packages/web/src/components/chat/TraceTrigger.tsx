import type { TraceSummary } from "@rome/api-types/trace-segments";
import { CollapsedTraceButton } from "@/components/agent-trace/AgentTrace";
import type { TraceDrawerTarget } from "@/components/agent-trace/TraceDrawer";

export function TraceTrigger({
  messageId,
  sessionId,
  turnId,
  summary,
  onOpen,
  compact = false,
}: {
  messageId: string;
  sessionId: string;
  turnId: string | null;
  summary: TraceSummary;
  onOpen: (target: TraceDrawerTarget) => void;
  compact?: boolean;
}) {
  const button = (
    <CollapsedTraceButton
      summary={summary}
      compact={compact}
      onClick={() => onOpen({ kind: "stored", messageId, sessionId, turnId, summary })}
    />
  );
  if (compact) return button;
  return <div className="mb-2 w-full md:max-w-[85%]">{button}</div>;
}

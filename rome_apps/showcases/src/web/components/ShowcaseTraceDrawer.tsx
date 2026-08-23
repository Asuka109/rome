import { useEffect, useRef } from "react";
import { X, Download } from "lucide-react";
import type { TraceSegment, TraceSummary } from "../../trace/types.js";
import { TraceBody } from "../vendor/rome-core/AgentTrace.js";
import { CollapsedTraceSummary } from "../vendor/rome-core/CollapsedTraceSummary.js";
import { renderInlineBlock, renderRunBlocks } from "../trace/render.js";

// Standalone drawer shell mirroring rome-core's TraceDrawer layout, but fed a
// static, already-imported snapshot instead of fetching from the chat runtime.
// The trace content itself is the vendored <TraceBody>. See web/vendor/VENDOR.md
// for why TraceDrawer is adapted rather than vendored verbatim.

export function ShowcaseTraceDrawer({
  open,
  summary,
  segments,
  rawHref,
  onClose,
}: {
  open: boolean;
  summary: TraceSummary;
  segments: TraceSegment[];
  rawHref?: string;
  onClose: () => void;
}) {
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const id = requestAnimationFrame(() => closeBtnRef.current?.focus());
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener("keydown", handler);
    return () => {
      cancelAnimationFrame(id);
      document.removeEventListener("keydown", handler);
    };
  }, [open, onClose]);

  return (
    <aside
      role="dialog"
      aria-label="Agent trace"
      aria-hidden={!open}
      className={`flex shrink-0 flex-col overflow-hidden bg-background transition-[width] duration-200 ease-out ${
        open ? "w-full border-l border-border md:w-[480px]" : "w-0"
      }`}
    >
      <div className="flex min-w-0 items-center gap-2 border-b border-border px-4 py-3">
        <h3 className="flex-none text-sm font-medium text-foreground">Trace</h3>
        <div className="ml-2 min-w-0 flex-1">
          <CollapsedTraceSummary summary={summary} />
        </div>
        {rawHref && (
          <a
            href={rawHref}
            download
            className="inline-flex items-center justify-center rounded-8 px-2 py-1 text-muted-foreground hover:bg-surface-muted hover:text-foreground"
            aria-label="Download raw trace JSON"
            title="Download raw trace JSON"
          >
            <Download className="h-4 w-4" />
          </a>
        )}
        <button
          ref={closeBtnRef}
          type="button"
          onClick={onClose}
          className="inline-flex items-center justify-center rounded-8 px-2 py-1 text-muted-foreground hover:bg-surface-muted hover:text-foreground"
          aria-label="Close trace"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3">
        <TraceBody
          segments={segments}
          renderInlineBlock={renderInlineBlock}
          renderRunBlocks={renderRunBlocks}
        />
      </div>
    </aside>
  );
}

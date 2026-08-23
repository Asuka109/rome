import { useLayoutEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import Markdown from "@/components/chat/ChatMarkdown";

const COMPACT_TEXT_COLLAPSED_MAX_HEIGHT = 240;
const COMPACT_TEXT_FADE_MASK = "linear-gradient(to bottom, black 70%, transparent 100%)";

export function TextBlock({ content, compact = false }: { content: string; compact?: boolean }) {
  if (!compact) {
    return (
      <Markdown className="text-foreground" compact={false}>
        {content}
      </Markdown>
    );
  }
  return <CompactTextBlock content={content} />;
}

export function CompactTextBlock({ content }: { content: string }) {
  const { t } = useTranslation("chat");
  const [expanded, setExpanded] = useState(false);
  const [overflowing, setOverflowing] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const measure = () => setOverflowing(el.scrollHeight > COMPACT_TEXT_COLLAPSED_MAX_HEIGHT + 1);
    measure();
    // We watch width only — the observed element's height also changes when
    // the user toggles expand/collapse, but that doesn't affect wrap and we
    // don't want to re-measure for it. Width changes (drawer reflow at a
    // responsive breakpoint) do alter wrapped-line height, so re-measure then.
    let lastWidth = el.getBoundingClientRect().width;
    const ro = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width;
      if (width === undefined || width === lastWidth) return;
      lastWidth = width;
      measure();
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [content]);

  const collapsed = !expanded && overflowing;

  return (
    <div className="relative">
      <div
        ref={contentRef}
        className="overflow-hidden"
        style={
          collapsed
            ? {
                maxHeight: COMPACT_TEXT_COLLAPSED_MAX_HEIGHT,
                maskImage: COMPACT_TEXT_FADE_MASK,
                WebkitMaskImage: COMPACT_TEXT_FADE_MASK,
              }
            : undefined
        }
      >
        <Markdown className="text-foreground" compact>
          {content}
        </Markdown>
      </div>
      {overflowing && (
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded((v) => !v)}
          className="mt-1 inline-flex items-center gap-1 text-aux text-muted-foreground transition-colors hover:text-foreground"
        >
          {expanded ? t("blocks.showLess") : t("blocks.showMore")}
        </button>
      )}
    </div>
  );
}

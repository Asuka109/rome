import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarDays,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  X,
} from "lucide-react";
import { Markdown } from "./Markdown";
import type { BriefDto } from "../lib/types";

/* ------------------------------------------------------------------ types */

/** Which face of the document a page sits on. "single" is the phone view:
 * one sheet at a time, no gutter shading. */
type Side = "left" | "right" | "single";

interface DayInfo {
  key: string; // yyyy-mm-dd in the briefing timezone
  longDate: string; // "Saturday, July 5"
  year: string; // "2026"
  shortDate: string; // "Jul 5"
}

type BookPage =
  | { type: "front"; day: DayInfo; briefs: BriefDto[] }
  | { type: "detail"; brief: BriefDto; day: DayInfo; seq: number; of: number }
  | { type: "blank"; day: DayInfo };

type Slot = { kind: "empty"; index: number } | { kind: "page"; page: BookPage; index: number };

interface TurnState {
  from: number;
  to: number;
  dir: 1 | -1;
  engaged: boolean;
}

const TURN_EASE = "cubic-bezier(0.4, 0.05, 0.15, 1)";
/** Spread flip vs. the shorter single-sheet fold on phones. */
const TURN_DUR_SPREAD = 550;
const TURN_DUR_SINGLE = 420;

const KIND_LABEL: Record<string, string> = {
  morning: "Morning Brief",
  evening: "Evening Brief",
  test: "Test Brief",
};

/* ------------------------------------------------- markdown sectioning ---- */

interface BriefSection {
  title: string;
  body: string;
}

interface ParsedBrief {
  /** Leading lines before the first section header (greeting / date line). */
  greeting: string;
  sections: BriefSection[];
}

const isActionTitle = (t: string) => /focus|action|priorit|to.?do|next step/i.test(t);
const isSummaryTitle = (t: string) => /summary|overview|tl;?dr/i.test(t);

/** Split brief markdown into named sections. Headers are whole-line bold
 * (`**Calendar**`) or markdown headings (`## Calendar`). */
function parseBrief(content: string): ParsedBrief {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const sections: BriefSection[] = [];
  const greeting: string[] = [];
  let current: { title: string; lines: string[] } | null = null;
  for (const line of lines) {
    const bold = line.match(/^\s*\*\*([^*]{1,60})\*\*:?\s*$/);
    const hash = line.match(/^\s*#{1,4}\s+(.{1,80})$/);
    const title = bold?.[1] ?? hash?.[1];
    if (title) {
      if (current) sections.push({ title: current.title, body: current.lines.join("\n").trim() });
      current = { title: title.trim(), lines: [] };
    } else if (current) {
      current.lines.push(line);
    } else {
      greeting.push(line);
    }
  }
  if (current) sections.push({ title: current.title, body: current.lines.join("\n").trim() });
  return { greeting: greeting.join("\n").trim(), sections };
}

/** Pull bullet items out of a section body (for the action-item register). */
function bulletItems(body: string): string[] {
  return body
    .split("\n")
    .map((l) => l.match(/^\s*(?:[-*]|\d+[.)])\s+(.*)$/)?.[1])
    .filter((x): x is string => Boolean(x && x.trim()));
}

/* ---------------------------------------------------------------- helpers */

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function makeFormatters(tz: string) {
  const opts = (o: Intl.DateTimeFormatOptions): Intl.DateTimeFormat => {
    try {
      return new Intl.DateTimeFormat(undefined, { ...o, timeZone: tz });
    } catch {
      return new Intl.DateTimeFormat(undefined, o);
    }
  };
  const keyFmt = opts({ year: "numeric", month: "2-digit", day: "2-digit" });
  return {
    key: (d: Date): string => {
      const parts = keyFmt.formatToParts(d);
      const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
      return `${get("year")}-${get("month")}-${get("day")}`;
    },
    longDate: opts({ weekday: "long", month: "long", day: "numeric" }),
    year: opts({ year: "numeric" }),
    shortDate: opts({ month: "short", day: "numeric" }),
    time: opts({ hour: "numeric", minute: "2-digit" }),
    monthTitle: opts({ month: "long", year: "numeric" }),
  };
}

type Formatters = ReturnType<typeof makeFormatters>;

/* ------------------------------------------------------------- main export */

export function BriefBook({ briefs, timezone }: { briefs: BriefDto[]; timezone: string }) {
  const fmt = useMemo(() => makeFormatters(timezone), [timezone]);

  // Pages per view: 2 = desktop spread, 1 = phone single sheet.
  const [perView, setPerView] = useState<1 | 2>(2);
  const turnDur = perView === 1 ? TURN_DUR_SINGLE : TURN_DUR_SPREAD;

  // ---- build the document: per day, a front page + one detail page per brief.
  const { pages, dayToPos, dayKeys } = useMemo(() => {
    const sorted = [...briefs].sort(
      (a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime(),
    );
    const days = new Map<string, { day: DayInfo; items: BriefDto[] }>();
    for (const b of sorted) {
      const d = new Date(b.startedAt);
      const key = fmt.key(d);
      if (!days.has(key)) {
        days.set(key, {
          day: {
            key,
            longDate: fmt.longDate.format(d),
            year: fmt.year.format(d),
            shortDate: fmt.shortDate.format(d),
          },
          items: [],
        });
      }
      days.get(key)!.items.push(b);
    }
    const pages: BookPage[] = [];
    for (const { day, items } of days.values()) {
      pages.push({ type: "front", day, briefs: items });
      items.forEach((brief, i) =>
        pages.push({ type: "detail", brief, day, seq: i + 1, of: items.length }),
      );
      // Spread view: pad odd days so every day's document starts on a left
      // page. The single-sheet view has no spreads, so no filler pages.
      if (perView === 2 && (items.length + 1) % 2 === 1) pages.push({ type: "blank", day });
    }
    const dayToPos = new Map<string, number>();
    pages.forEach((p, i) => {
      if (!dayToPos.has(p.day.key)) dayToPos.set(p.day.key, Math.floor(i / perView) + 1);
    });
    return { pages, dayToPos, dayKeys: [...dayToPos.keys()] };
  }, [briefs, fmt, perView]);

  const maxPos = Math.max(1, Math.ceil(pages.length / perView));

  // Open on the latest day's front spread.
  const [pos, setPos] = useState(() =>
    dayKeys.length > 0 ? (dayToPos.get(dayKeys[dayKeys.length - 1]) ?? 1) : 1,
  );
  const [turn, setTurn] = useState<TurnState | null>(null);
  const [finderOpen, setFinderOpen] = useState(false);

  const slotFor = useCallback(
    (p: number, side: Side): Slot => {
      const index = side === "single" ? p - 1 : 2 * (p - 1) + (side === "right" ? 1 : 0);
      const page = pages[index];
      return page ? { kind: "page", page, index } : { kind: "empty", index };
    },
    [pages],
  );

  const goTo = useCallback(
    (to: number) => {
      if (turn) return;
      if (to < 1 || to > maxPos || to === pos) return;
      setFinderOpen(false);
      setTurn({ from: pos, to, dir: to > pos ? 1 : -1, engaged: false });
    },
    [turn, maxPos, pos],
  );

  // Two-phase flip: mount the sheet at its start angle, let that frame paint
  // (double rAF — a single one can engage before first paint and skip the
  // start of the turn), then engage the transition and commit on landing.
  useEffect(() => {
    if (!turn) return;
    if (!turn.engaged) {
      let inner = 0;
      const outer = requestAnimationFrame(() => {
        inner = requestAnimationFrame(() =>
          setTurn((t) => (t && !t.engaged ? { ...t, engaged: true } : t)),
        );
      });
      return () => {
        cancelAnimationFrame(outer);
        cancelAnimationFrame(inner);
      };
    }
    const id = setTimeout(() => {
      setPos(turn.to);
      setTurn(null);
    }, turnDur + 30);
    return () => clearTimeout(id);
  }, [turn, turnDur]);

  // Keyboard navigation.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) return;
      if (e.key === "ArrowRight") goTo(pos + 1);
      if (e.key === "ArrowLeft") goTo(pos - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goTo, pos]);

  // ---- responsive document sizing + view-mode selection.
  const frameRef = useRef<HTMLDivElement | null>(null);
  const [bookSize, setBookSize] = useState({ w: 860, h: 580 });
  useEffect(() => {
    const update = () => {
      const el = frameRef.current;
      if (!el) return;
      const availH = el.clientHeight - 20;
      const single = el.clientWidth < 600;
      setPerView(single ? 1 : 2);
      if (single) {
        // One sheet: use the frame's full height (capped so landscape phones
        // don't produce an absurdly tall page).
        const pageW = Math.min(el.clientWidth - 28, 480);
        const pageH = Math.max(380, Math.min(availH, pageW * 1.9));
        setBookSize({ w: Math.max(260, pageW), h: pageH });
      } else {
        const availW = el.clientWidth - 36;
        const pageW = Math.min(availW / 2, 460);
        let pageH = pageW * 1.32;
        if (pageH > availH) pageH = Math.max(380, availH);
        setBookSize({ w: Math.max(300, pageW * 2), h: pageH });
      }
    };
    update();
    const ro = new ResizeObserver(update);
    if (frameRef.current) ro.observe(frameRef.current);
    window.addEventListener("resize", update);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, []);

  // Re-anchor on view-mode change: positions are counted in views, so the same
  // number means a different page in 1-up vs 2-up. Keep the visible day.
  const visibleDayRef = useRef<string | null>(null);
  const prevPerViewRef = useRef(perView);
  useEffect(() => {
    if (prevPerViewRef.current === perView) return;
    prevPerViewRef.current = perView;
    setTurn(null);
    const key = visibleDayRef.current;
    setPos(key && dayToPos.has(key) ? dayToPos.get(key)! : Math.max(1, maxPos));
  }, [perView, dayToPos, maxPos]);

  // Clamp when the document shrinks (e.g. filler pages drop out).
  useEffect(() => {
    setPos((p) => Math.min(Math.max(1, p), maxPos));
  }, [maxPos]);

  // ---- swipe navigation (phones).
  const touchRef = useRef<{ x: number; y: number } | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touchRef.current = { x: t.clientX, y: t.clientY };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const start = touchRef.current;
    touchRef.current = null;
    if (!start) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      goTo(pos + (dx < 0 ? 1 : -1));
    }
  };

  // During a turn the base spread shows the destination's outer faces.
  const lo = turn ? Math.min(turn.from, turn.to) : pos;
  const hi = turn ? Math.max(turn.from, turn.to) : pos;
  const baseLeft = slotFor(lo, "left");
  const baseRight = slotFor(hi, "right");
  const sheetFront = turn ? slotFor(lo, "right") : null;
  const sheetBack = turn ? slotFor(hi, "left") : null;
  const sheetAngle = turn
    ? turn.dir === 1
      ? turn.engaged
        ? -180
        : 0
      : turn.engaged
        ? 0
        : -180
    : 0;

  // Single-sheet view: forward folds the current page away over a base that
  // already shows the destination; backward folds the destination back in.
  const singleBase =
    perView === 1 ? slotFor(turn ? (turn.dir === 1 ? turn.to : turn.from) : pos, "single") : null;
  const singleSheet =
    perView === 1 && turn ? slotFor(turn.dir === 1 ? turn.from : turn.to, "single") : null;
  const singleAngle = turn
    ? turn.dir === 1
      ? turn.engaged
        ? -90
        : 0
      : turn.engaged
        ? 0
        : -90
    : 0;

  const leftIndex = perView === 1 ? (singleBase?.index ?? 0) : baseLeft.index;
  const visibleDay =
    perView === 1
      ? singleBase?.kind === "page"
        ? singleBase.page.day
        : null
      : baseLeft.kind === "page"
        ? baseLeft.page.day
        : baseRight.kind === "page"
          ? baseRight.page.day
          : null;
  useEffect(() => {
    visibleDayRef.current = visibleDay?.key ?? null;
  });

  // Day stepper: previous / next day relative to the visible day.
  const dayIdx = visibleDay ? dayKeys.indexOf(visibleDay.key) : -1;
  const prevDayKey = dayIdx > 0 ? dayKeys[dayIdx - 1] : null;
  const nextDayKey = dayIdx >= 0 && dayIdx < dayKeys.length - 1 ? dayKeys[dayIdx + 1] : null;

  const renderSlot = (slot: Slot, side: Side) => {
    if (slot.kind === "empty") {
      return <EmptyPage index={slot.index} hasAny={pages.length > 0} />;
    }
    return (
      <MemoPage page={slot.page} side={side} index={slot.index} total={pages.length} fmt={fmt} />
    );
  };

  return (
    <div className="bb-desk relative overflow-hidden rounded-12 border border-border/60">
      {/* toolbar overlaying the desk */}
      <div className="relative z-30 flex flex-wrap items-center justify-between gap-2 px-3 pt-3">
        <div className="bb-plaque select-none text-badge">Daily Brief — Document</div>
        <div className="relative flex items-center gap-1.5">
          {/* day stepper */}
          <button
            type="button"
            className="bb-desk-btn bb-desk-icon-btn"
            onClick={() => prevDayKey && goTo(dayToPos.get(prevDayKey) ?? pos)}
            disabled={!prevDayKey}
            aria-label="Previous day"
          >
            <ChevronLeft className="size-4" />
          </button>
          <span className="bb-desk-date select-none text-aux tabular-nums">
            {visibleDay ? `${visibleDay.shortDate} ${visibleDay.year}` : "—"}
          </span>
          <button
            type="button"
            className="bb-desk-btn bb-desk-icon-btn"
            onClick={() => nextDayKey && goTo(dayToPos.get(nextDayKey) ?? pos)}
            disabled={!nextDayKey}
            aria-label="Next day"
          >
            <ChevronRight className="size-4" />
          </button>
          <button
            type="button"
            className="bb-desk-btn flex items-center gap-1.5 px-2.5"
            onClick={() => setFinderOpen((v) => !v)}
            disabled={dayKeys.length === 0}
          >
            <CalendarDays className="size-4" /> Date
          </button>
          {finderOpen && (
            <DateFinder
              dayToSpread={dayToPos}
              visibleDayKey={visibleDay?.key ?? dayKeys[dayKeys.length - 1] ?? null}
              fmt={fmt}
              onPick={(p) => goTo(p)}
              onClose={() => setFinderOpen(false)}
            />
          )}
        </div>
      </div>

      {/* the document */}
      <div
        ref={frameRef}
        className="relative flex items-center justify-center px-4 pb-3 pt-2"
        style={{ height: "min(72vh, 700px)", minHeight: 440 }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <div
          className="bb-book relative"
          style={{ width: bookSize.w, height: bookSize.h, perspective: 2600 }}
        >
          {perView === 1 && singleBase ? (
            <>
              {/* single sheet (phone) */}
              <div
                className="absolute inset-0"
                style={{ filter: "drop-shadow(0 14px 20px rgba(10, 14, 20, 0.45))" }}
              >
                <div className="bb-paper bb-paper-single h-full w-full">
                  {renderSlot(singleBase, "single")}
                </div>
              </div>

              {/* folding sheet */}
              {turn && singleSheet && (
                <div
                  className={`bb-single-sheet absolute inset-0 ${
                    turn.dir === 1 ? "bb-turn-fwd" : "bb-turn-back"
                  } ${turn.engaged ? "bb-engaged" : ""}`}
                  style={
                    {
                      transform: `rotateY(${singleAngle}deg)`,
                      transition: turn.engaged ? `transform ${turnDur}ms ${TURN_EASE}` : "none",
                      "--bb-dur": `${turnDur}ms`,
                    } as React.CSSProperties
                  }
                >
                  <div className="bb-sheet-face bb-face-front bb-paper bb-paper-single">
                    {renderSlot(singleSheet, "single")}
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              {/* base spread */}
              <div
                className="absolute inset-0 flex"
                style={{ filter: "drop-shadow(0 18px 26px rgba(10, 14, 20, 0.45))" }}
              >
                <div className="relative h-full w-1/2">
                  <div className="bb-paper bb-paper-left h-full w-full">
                    {renderSlot(baseLeft, "left")}
                  </div>
                </div>
                <div className="relative h-full w-1/2">
                  <div className="bb-paper bb-paper-right h-full w-full">
                    {renderSlot(baseRight, "right")}
                  </div>
                </div>
              </div>

              {/* shadow the turning sheet casts on the spread beneath it */}
              {turn && (
                <div
                  className={`bb-cast pointer-events-none absolute inset-0 z-20 ${
                    turn.engaged ? "bb-cast-on" : ""
                  }`}
                  style={{ animationDuration: `${turnDur}ms` }}
                />
              )}

              {/* turning sheet */}
              {turn && sheetFront && sheetBack && (
                <div
                  className={`bb-sheet absolute left-1/2 top-0 h-full w-1/2 ${
                    turn.dir === 1 ? "bb-turn-fwd" : "bb-turn-back"
                  } ${turn.engaged ? "bb-engaged" : ""}`}
                  style={
                    {
                      transform: `rotateY(${sheetAngle}deg)`,
                      transition: turn.engaged ? `transform ${turnDur}ms ${TURN_EASE}` : "none",
                      "--bb-dur": `${turnDur}ms`,
                    } as React.CSSProperties
                  }
                >
                  <div className="bb-sheet-face bb-face-front bb-paper bb-paper-right">
                    {renderSlot(sheetFront, "right")}
                  </div>
                  <div className="bb-sheet-face bb-sheet-back bb-face-back bb-paper bb-paper-left">
                    {renderSlot(sheetBack, "left")}
                  </div>
                </div>
              )}
            </>
          )}

          {/* nav arrows — desktop spread only; phones swipe or use the footer */}
          {perView === 2 && pos > 1 && (
            <button
              type="button"
              className="bb-arrow bb-arrow-left"
              onClick={() => goTo(pos - 1)}
              aria-label="Previous pages"
            >
              <ChevronLeft className="size-5" />
            </button>
          )}
          {perView === 2 && pos < maxPos && (
            <button
              type="button"
              className="bb-arrow bb-arrow-right"
              onClick={() => goTo(pos + 1)}
              aria-label="Next pages"
            >
              <ChevronRight className="size-5" />
            </button>
          )}
        </div>
      </div>

      {/* footer strip */}
      <div className="relative z-20 flex items-center justify-center gap-2 pb-3 sm:gap-3">
        <button
          type="button"
          className="bb-foot-btn"
          onClick={() => goTo(1)}
          title="First pages"
          disabled={pos <= 1}
        >
          <ChevronsLeft className="size-3.5" />
        </button>
        {perView === 1 && (
          <button
            type="button"
            className="bb-foot-btn"
            onClick={() => goTo(pos - 1)}
            title="Previous page"
            disabled={pos <= 1}
          >
            <ChevronLeft className="size-3.5" />
          </button>
        )}
        <span className="bb-foot-label">
          {visibleDay
            ? perView === 1
              ? `${visibleDay.shortDate}, ${visibleDay.year}  ·  p. ${Math.min(pos, pages.length)} / ${Math.max(pages.length, 1)}`
              : `${visibleDay.longDate}, ${visibleDay.year}  ·  p. ${Math.min(leftIndex + 1, pages.length)}–${Math.min(leftIndex + 2, pages.length)} / ${pages.length}`
            : "No briefs on file"}
        </span>
        {perView === 1 && (
          <button
            type="button"
            className="bb-foot-btn"
            onClick={() => goTo(pos + 1)}
            title="Next page"
            disabled={pos >= maxPos}
          >
            <ChevronRight className="size-3.5" />
          </button>
        )}
        <button
          type="button"
          className="bb-foot-btn"
          onClick={() => goTo(maxPos)}
          title="Latest pages"
          disabled={pos >= maxPos}
        >
          <ChevronsRight className="size-3.5" />
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ pages */

function PageNumber({ index }: { index: number }) {
  return <span className="bb-pagenum">{pad2(index + 1)}</span>;
}

function EmptyPage({ index, hasAny }: { index: number; hasAny: boolean }) {
  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center p-6">
      {!hasAny && index === 0 && (
        <div className="text-center">
          <p className="bb-mono text-ui" style={{ color: "#8b95a3" }}>
            No briefs on file
          </p>
          <p className="mt-2 max-w-[26ch] text-[13px] leading-relaxed" style={{ color: "#5b6675" }}>
            Run a test brief, or enable the morning &amp; evening schedule in Settings.
          </p>
        </div>
      )}
      <PageNumber index={index} />
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="bb-sec-head">
      <span>{children}</span>
    </div>
  );
}

function StatusTag({ brief }: { brief: BriefDto }) {
  if (brief.status === "failed") return <span className="bb-tag bb-tag-red">Failed</span>;
  if (brief.delivered) return <span className="bb-tag bb-tag-green">Sent · {brief.channel}</span>;
  if (brief.deliveryError) return <span className="bb-tag bb-tag-amber">Not sent</span>;
  return null;
}

/** Front page of a day's document: masthead, action items, executive summary,
 * and a contents line for the detail pages that follow. */
function FrontPage({
  day,
  briefs,
  index,
  fmt,
}: {
  day: DayInfo;
  briefs: BriefDto[];
  index: number;
  fmt: Formatters;
}) {
  const latest = briefs[briefs.length - 1];
  const parsed = useMemo(() => parseBrief(latest.content ?? ""), [latest.content]);

  const actionSection = parsed.sections.find((s) => isActionTitle(s.title));
  const actionItems = actionSection ? bulletItems(actionSection.body) : [];
  const summarySection = parsed.sections.find((s) => isSummaryTitle(s.title));
  const summaryBody = summarySection?.body || parsed.greeting;

  return (
    <div className="bb-page-pad relative flex h-full w-full flex-col overflow-hidden">
      {/* masthead */}
      <div className="bb-masthead shrink-0">
        <div className="flex items-baseline justify-between gap-3">
          <span
            className="bb-mono text-[9px] uppercase tracking-[0.32em]"
            style={{ color: "#8b95a3" }}
          >
            Daily Brief
          </span>
          <span className="bb-mono text-[9px] tracking-[0.18em]" style={{ color: "#8b95a3" }}>
            {day.key}
          </span>
        </div>
        <h1
          className="bb-masthead-title mt-2 font-semibold leading-tight tracking-tight"
          style={{ color: "#1c232e" }}
        >
          {day.longDate}, {day.year}
        </h1>
        <p
          className="bb-mono mt-1.5 text-[9.5px] uppercase tracking-[0.14em]"
          style={{ color: "#8b95a3" }}
        >
          {briefs.length} {briefs.length === 1 ? "brief" : "briefs"} on file · latest{" "}
          {fmt.time.format(new Date(latest.startedAt))}
        </p>
      </div>

      <div className="bb-scroll relative z-10 mt-3 min-h-0 flex-1 overflow-y-auto pr-1.5">
        {/* action items */}
        <SectionHeading>Action Items</SectionHeading>
        {actionItems.length > 0 ? (
          <ol className="bb-actions">
            {actionItems.map((item, i) => (
              <li key={i}>
                <CheckSquare className="bb-action-check" />
                <span>
                  <Markdown content={item} />
                </span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="bb-none-note">No action items recorded.</p>
        )}

        {/* executive summary */}
        <SectionHeading>Executive Summary</SectionHeading>
        {summaryBody ? (
          <div className="bb-ink bb-summary">
            <Markdown content={summaryBody} />
          </div>
        ) : (
          <p className="bb-none-note">No summary recorded.</p>
        )}

        {/* contents */}
        <SectionHeading>In This Document</SectionHeading>
        <ul className="bb-toc">
          {briefs.map((b, i) => (
            <li key={b.id}>
              <span className="bb-mono bb-toc-num">{pad2(index + i + 2)}</span>
              <span className="bb-toc-title">{KIND_LABEL[b.kind] ?? b.kind}</span>
              <span className="bb-toc-dots" />
              <span className="bb-mono bb-toc-time">{fmt.time.format(new Date(b.startedAt))}</span>
            </li>
          ))}
        </ul>
      </div>

      <PageNumber index={index} />
    </div>
  );
}

/** Detail page: one brief in full, sectioned. */
function DetailPage({
  brief,
  day,
  seq,
  of,
  index,
  fmt,
}: {
  brief: BriefDto;
  day: DayInfo;
  seq: number;
  of: number;
  index: number;
  fmt: Formatters;
}) {
  const parsed = useMemo(() => parseBrief(brief.content ?? ""), [brief.content]);
  const time = fmt.time.format(new Date(brief.startedAt));

  return (
    <div className="bb-page-pad relative flex h-full w-full flex-col overflow-hidden">
      {/* page header */}
      <div className="bb-detail-head flex shrink-0 items-baseline justify-between gap-2">
        <div>
          <p
            className="bb-mono text-[9px] uppercase tracking-[0.28em]"
            style={{ color: "#8b95a3" }}
          >
            {day.shortDate} · {seq} / {of}
          </p>
          <h2
            className="mt-1 text-[15px] font-semibold tracking-tight"
            style={{ color: "#1c232e" }}
          >
            {KIND_LABEL[brief.kind] ?? brief.kind}
          </h2>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="bb-mono text-aux tabular-nums" style={{ color: "#5b6675" }}>
            {time}
          </span>
          <StatusTag brief={brief} />
        </div>
      </div>

      {/* content */}
      <div className="bb-scroll bb-ink relative z-10 mt-2 min-h-0 flex-1 overflow-y-auto pr-1.5">
        {brief.deliveryError && <p className="bb-errnote">Delivery issue: {brief.deliveryError}</p>}
        {brief.content ? (
          parsed.sections.length > 0 ? (
            <>
              {parsed.sections.map((s, i) => (
                <div key={i} className="bb-detail-sec">
                  <SectionHeading>{s.title}</SectionHeading>
                  <Markdown content={s.body || "_(nothing recorded)_"} />
                </div>
              ))}
            </>
          ) : (
            <Markdown content={brief.content} />
          )
        ) : brief.status === "pending" ? (
          <p className="bb-none-note mt-4 text-center">In preparation…</p>
        ) : (
          <p className="bb-errnote">{brief.error ?? "No content."}</p>
        )}
      </div>

      {/* footer */}
      <div className="relative z-10 mt-1 flex shrink-0 items-center justify-between">
        <span
          className="bb-mono text-[9px] uppercase tracking-[0.14em]"
          style={{ color: "#8b95a3" }}
        >
          {brief.scoutResultCount > 0
            ? `${brief.scoutResultCount} scouting finding${brief.scoutResultCount === 1 ? "" : "s"} incorporated`
            : ""}
        </span>
      </div>
      <PageNumber index={index} />
    </div>
  );
}

function MemoPage({
  page,
  side,
  index,
  total: _total,
  fmt,
}: {
  page: BookPage;
  side: Side;
  index: number;
  total: number;
  fmt: Formatters;
}) {
  const gutter =
    side === "single" ? null : (
      <div
        className={`pointer-events-none absolute inset-y-0 z-0 w-8 ${
          side === "left" ? "right-0 bb-gutter-left" : "left-0 bb-gutter-right"
        }`}
      />
    );

  if (page.type === "blank") {
    return (
      <div className="relative flex h-full w-full flex-col items-center justify-center p-6">
        <p
          className="bb-mono text-[9px] uppercase tracking-[0.3em] opacity-60"
          style={{ color: "#8b95a3" }}
        >
          This page intentionally left blank
        </p>
        <PageNumber index={index} />
        {gutter}
      </div>
    );
  }

  if (page.type === "front") {
    return (
      <div className="relative h-full w-full">
        <FrontPage day={page.day} briefs={page.briefs} index={index} fmt={fmt} />
        {gutter}
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      <DetailPage
        brief={page.brief}
        day={page.day}
        seq={page.seq}
        of={page.of}
        index={index}
        fmt={fmt}
      />
      {gutter}
    </div>
  );
}

/* ------------------------------------------------------------ date finder */

function DateFinder({
  dayToSpread,
  visibleDayKey,
  fmt,
  onPick,
  onClose,
}: {
  dayToSpread: Map<string, number>;
  visibleDayKey: string | null;
  fmt: Formatters;
  onPick: (spread: number) => void;
  onClose: () => void;
}) {
  const todayKey = useMemo(() => fmt.key(new Date()), [fmt]);
  const initial = visibleDayKey ?? todayKey;
  const [cursor, setCursor] = useState(() => {
    const [y, m] = initial.split("-").map(Number);
    return { y, m: (m ?? 1) - 1 };
  });

  const monthLabel = useMemo(() => {
    // Format via a mid-month UTC date so the timezone can't shift the month.
    return fmt.monthTitle.format(new Date(Date.UTC(cursor.y, cursor.m, 15, 12)));
  }, [cursor, fmt]);

  const cells = useMemo(() => {
    const first = new Date(cursor.y, cursor.m, 1);
    const daysInMonth = new Date(cursor.y, cursor.m + 1, 0).getDate();
    const lead = first.getDay();
    const out: ({ d: number; key: string } | null)[] = [];
    for (let i = 0; i < lead; i++) out.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      out.push({ d, key: `${cursor.y}-${pad2(cursor.m + 1)}-${pad2(d)}` });
    }
    return out;
  }, [cursor]);

  return (
    <div className="bb-finder absolute right-0 top-full z-40 mt-2 w-[272px] rounded-12 p-3">
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          className="bb-finder-nav"
          onClick={() =>
            setCursor((c) => (c.m === 0 ? { y: c.y - 1, m: 11 } : { y: c.y, m: c.m - 1 }))
          }
          aria-label="Previous month"
        >
          <ChevronLeft className="size-4" />
        </button>
        <span className="text-sm font-semibold" style={{ color: "#1c232e" }}>
          {monthLabel}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="bb-finder-nav"
            onClick={() =>
              setCursor((c) => (c.m === 11 ? { y: c.y + 1, m: 0 } : { y: c.y, m: c.m + 1 }))
            }
            aria-label="Next month"
          >
            <ChevronRight className="size-4" />
          </button>
          <button type="button" className="bb-finder-nav" onClick={onClose} aria-label="Close">
            <X className="size-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-0.5 text-center">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <span
            key={`${d}-${i}`}
            className="bb-mono pb-1 text-[9px] font-semibold"
            style={{ color: "#8b95a3" }}
          >
            {d}
          </span>
        ))}
        {cells.map((cell, i) =>
          cell === null ? (
            <span key={`x-${i}`} />
          ) : (
            <button
              key={cell.key}
              type="button"
              disabled={!dayToSpread.has(cell.key)}
              onClick={() => {
                const s = dayToSpread.get(cell.key);
                if (s != null) onPick(s);
              }}
              className={`bb-finder-day ${dayToSpread.has(cell.key) ? "bb-finder-day-on" : ""} ${
                cell.key === visibleDayKey ? "bb-finder-day-here" : ""
              } ${cell.key === todayKey ? "bb-finder-day-today" : ""}`}
            >
              {cell.d}
            </button>
          ),
        )}
      </div>

      <p className="mt-2 text-center text-aux" style={{ color: "#8b95a3" }}>
        Marked days hold a document — select one to open it.
      </p>
    </div>
  );
}

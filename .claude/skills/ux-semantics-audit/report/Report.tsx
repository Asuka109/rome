import { useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@rome-os/ui/badge";
import { Button } from "@rome-os/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@rome-os/ui/card";
import { Dialog, DialogTitle } from "@rome-os/ui/dialog";
import { SegmentedControl } from "@rome-os/ui/segmented-control";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@rome-os/ui/select";
import { Textarea } from "@rome-os/ui/textarea";
import { report } from "./findings";
import { inline } from "./prose";
import { buildPrompt } from "./prompt";
import type { Finding, ReproMode, Severity } from "./types";

type Decision = "open" | "fix" | "skip";

const DECISIONS_KEY = "rome-ux-semantics-audit-decisions";

/** Triage survives a reload so a long report can be worked through in sittings. */
function loadDecisions(): Record<string, Decision> {
  try {
    const raw = localStorage.getItem(`${DECISIONS_KEY}:${report.route}`);
    return raw ? (JSON.parse(raw) as Record<string, Decision>) : {};
  } catch {
    return {};
  }
}

export function Report() {
  const [severity, setSeverity] = useState<Severity | "all">("all");
  const [surface, setSurface] = useState("all");
  const [decisions, setDecisions] = useState<Record<string, Decision>>(loadDecisions);
  const [exportOpen, setExportOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(`${DECISIONS_KEY}:${report.route}`, JSON.stringify(decisions));
    } catch {
      // Private-mode or a file:// origin with storage disabled — triage still
      // works for this sitting, it just doesn't outlive the tab.
    }
  }, [decisions]);

  const surfaces = useMemo(() => Array.from(new Set(report.findings.map((f) => f.surface))), []);

  const visible = report.findings.filter(
    (f) =>
      (severity === "all" || f.severity === severity) &&
      (surface === "all" || f.surface === surface),
  );

  const counts = report.findings.reduce(
    (acc, f) => {
      const d = decisions[f.id] ?? "open";
      acc[d] += 1;
      return acc;
    },
    { open: 0, fix: 0, skip: 0 } as Record<Decision, number>,
  );

  const blocks = report.findings.filter((f) => f.severity === "block").length;
  const warns = report.findings.length - blocks;
  const decided = counts.fix + counts.skip;

  return (
    <div className="min-h-screen bg-background pb-28 text-foreground">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-end gap-6 px-6 pt-9 pb-7">
          <div className="min-w-0 flex-1 basis-96">
            <p className="mb-2 font-mono text-2xs tracking-wider text-muted-foreground uppercase">
              UX audit · rome-web · rule-based
            </p>
            <h1 className="font-serif text-4xl leading-tight font-semibold text-balance">
              {report.headline}{" "}
              <code className="rounded-md bg-surface-muted px-2 font-mono text-2xl text-primary">
                {report.route}
              </code>
            </h1>
            <p className="mt-3 max-w-2xl text-muted-foreground">{inline(report.standfirst)}</p>
          </div>
          <div className="flex gap-3">
            <Tally n={blocks} label="Block" tone="text-destructive-fg" />
            <Tally n={warns} label="Warn" tone="text-warning-fg" />
          </div>
        </div>
      </header>

      <nav className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-3 px-6 py-2.5">
          <SegmentedControl
            aria-label="Filter by severity"
            size="sm"
            value={severity}
            onValueChange={(v) => setSeverity(v as Severity | "all")}
            options={[
              { value: "all", label: "All" },
              { value: "block", label: "Block" },
              { value: "warn", label: "Warn" },
            ]}
          />
          <Select value={surface} onValueChange={setSurface}>
            <SelectTrigger size="sm" className="w-48" aria-label="Filter by surface">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All surfaces</SelectItem>
              {surfaces.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="ml-auto font-mono text-2xs text-muted-foreground">
            {visible.length} of {report.findings.length} shown
          </span>
        </div>
      </nav>

      <main className="mx-auto w-full max-w-5xl px-6 py-10">
        <div className="mb-10 rounded-r-lg border border-l-3 border-border border-l-primary bg-surface px-5 py-4">
          {report.summary.map((p, i) => (
            <p key={i} className="mb-2.5 max-w-3xl text-muted-foreground last:mb-0">
              {inline(p)}
            </p>
          ))}
        </div>

        <SectionHead
          title="Findings"
          note="Block first, then warn — each group ordered by user impact against fix cost."
        />

        <ol className="flex list-none flex-col gap-5 p-0">
          {visible.map((f) => (
            <FindingCard
              key={f.id}
              finding={f}
              decision={decisions[f.id] ?? "open"}
              onDecide={(d) => setDecisions((prev) => ({ ...prev, [f.id]: d }))}
            />
          ))}
        </ol>

        <SectionHead title="Passes worth keeping" note="Preserve these while fixing the above." />
        <ul className="grid list-none gap-3 p-0">
          {report.keep.map((n) => (
            <li
              key={n.lead}
              className="rounded-lg border border-l-3 border-border border-l-success bg-surface px-4 py-3"
            >
              <span className="font-medium">{n.lead}</span>
              <p className="mt-1 text-sm text-muted-foreground">{inline(n.body)}</p>
            </li>
          ))}
        </ul>

        <SectionHead
          title="Examined and not flagged"
          note="Where the boundaries are, so the flags above carry weight."
        />
        <ul className="grid list-none gap-3 p-0">
          {report.declined.map((n) => (
            <li key={n.lead} className="rounded-lg border border-border bg-surface px-4 py-3">
              <span className="font-medium text-muted-foreground">{n.lead}</span>
              <p className="mt-1 text-sm text-muted-foreground">{inline(n.body)}</p>
            </li>
          ))}
        </ul>

        <footer className="mt-14 border-t border-border pt-5 text-sm text-muted-foreground">
          {inline(report.footer)}
        </footer>
      </main>

      <div
        className={`fixed inset-x-0 bottom-0 z-50 border-t border-border bg-surface/95 backdrop-blur transition-transform ${
          decided > 0 ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-3 px-6 py-3">
          <p className="text-sm text-muted-foreground">
            <b className="font-medium text-foreground">{counts.fix}</b> to fix
            <span className="mx-2 text-subtle-foreground">·</span>
            <b className="font-medium text-foreground">{counts.skip}</b> won&rsquo;t fix
            <span className="mx-2 text-subtle-foreground">·</span>
            {counts.open} undecided
          </p>
          <Button variant="outline" size="sm" onClick={() => setDecisions({})}>
            Clear all
          </Button>
          <Button
            className="ml-auto"
            disabled={counts.fix === 0}
            onClick={() => setExportOpen(true)}
          >
            Export as prompt
          </Button>
        </div>
      </div>

      <ExportDialog
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        text={buildPrompt(report, decisions)}
        counts={counts}
      />
    </div>
  );
}

function Tally({ n, label, tone }: { n: number; label: string; tone: string }) {
  return (
    <div className="min-w-24 rounded-lg border border-border bg-background px-4 py-2.5">
      <span className={`block font-serif text-3xl leading-none tabular-nums ${tone}`}>{n}</span>
      <span className="mt-1.5 block font-mono text-2xs tracking-wider text-muted-foreground uppercase">
        {label}
      </span>
    </div>
  );
}

function SectionHead({ title, note }: { title: string; note: string }) {
  return (
    <div className="mt-14 mb-5 flex flex-wrap items-baseline gap-3 border-b border-border pb-2.5 first:mt-0">
      <h2 className="font-serif text-xl font-semibold">{title}</h2>
      <p className="text-sm text-muted-foreground">{note}</p>
    </div>
  );
}

function FindingCard({
  finding,
  decision,
  onDecide,
}: {
  finding: Finding;
  decision: Decision;
  onDecide: (d: Decision) => void;
}) {
  const [mode, setMode] = useState<ReproMode>("shipped");

  return (
    // `Card` is a plain div with no `asChild`, so the list item wraps it rather
    // than being merged into it — otherwise the <ol> ends up with div children.
    <li
      className={`${decision === "skip" ? "opacity-50 hover:opacity-100 focus-within:opacity-100" : ""}`}
    >
      <Card
        className={`overflow-hidden ${decision === "fix" ? "border-l-3 border-l-success" : ""}`}
      >
        <CardHeader className="gap-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant={finding.severity === "block" ? "destructive" : "warning"}
              shape="square"
            >
              {finding.severity === "block" ? "Block" : "Warn"}
            </Badge>
            <span className="font-mono text-xs text-primary">{finding.rule}</span>
            <span className="ml-auto font-mono text-2xs text-muted-foreground">
              {finding.surface}
            </span>
          </div>
          <h3 className="font-serif text-xl leading-snug font-semibold text-balance">
            {finding.title}
          </h3>
        </CardHeader>

        <CardContent className="grid items-start gap-7 lg:grid-cols-[minmax(0,45ch)_minmax(0,1fr)]">
          <div>
            {finding.why.map((p, i) => (
              <p key={i} className="mb-3 text-muted-foreground">
                {inline(p)}
              </p>
            ))}

            <details className="mt-3">
              <summary className="cursor-pointer py-1 font-mono text-2xs text-muted-foreground hover:text-foreground">
                Evidence — {finding.evidence.where}
              </summary>
              <pre className="mt-1.5 overflow-x-auto rounded-md bg-surface-muted px-3.5 py-3 font-mono text-2xs leading-relaxed text-muted-foreground">
                {finding.evidence.code}
              </pre>
            </details>

            <div className="mt-3.5 border-t border-dashed border-border pt-3">
              <span className="mb-1 block font-mono text-2xs tracking-wider text-success-fg uppercase">
                Fix
              </span>
              <p className="text-muted-foreground">{inline(finding.fix)}</p>
            </div>
          </div>

          {finding.repro && (
            <figure className="m-0 min-w-0">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="font-mono text-2xs tracking-wider text-muted-foreground uppercase">
                  Rendered repro
                </span>
                <SegmentedControl
                  className="ml-auto"
                  aria-label="Reproduction mode"
                  size="sm"
                  value={mode}
                  onValueChange={(v) => setMode(v as ReproMode)}
                  options={[
                    { value: "shipped", label: "As shipped" },
                    { value: "fixed", label: "Fixed" },
                  ]}
                />
              </div>
              <div className="overflow-hidden rounded-lg border border-border bg-background">
                <div className="border-b border-border bg-surface-muted px-2.5 py-1.5 font-mono text-2xs text-muted-foreground">
                  {finding.repro.label}
                </div>
                <div className="relative p-3.5">{finding.repro.render(mode)}</div>
              </div>
              {finding.repro.hint && (
                <p className="mt-2 flex gap-1.5 text-sm text-muted-foreground">
                  <span aria-hidden className="font-semibold text-primary">
                    ↑
                  </span>
                  <span>{inline(finding.repro.hint)}</span>
                </p>
              )}
            </figure>
          )}
        </CardContent>

        <CardFooter className="flex-wrap gap-2.5 border-t border-border pt-3">
          <span className="font-mono text-2xs tracking-wider text-muted-foreground uppercase">
            Your call
          </span>
          <span className="text-sm text-muted-foreground">
            {decision === "fix" && "Goes into the export."}
            {decision === "skip" && "Listed as deliberately declined."}
          </span>
          <SegmentedControl
            className="ml-auto"
            aria-label="Resolution"
            size="sm"
            value={decision}
            onValueChange={(v) => onDecide(v as Decision)}
            options={[
              { value: "open", label: "Undecided" },
              { value: "fix", label: "Fix" },
              { value: "skip", label: "Won't fix" },
            ]}
          />
        </CardFooter>
      </Card>
    </li>
  );
}

function ExportDialog({
  open,
  onClose,
  text,
  counts,
}: {
  open: boolean;
  onClose: () => void;
  text: string;
  counts: Record<Decision, number>;
}) {
  const textRef = useRef<HTMLTextAreaElement>(null);
  const [copyLabel, setCopyLabel] = useState("Copy");

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopyLabel("Copied");
    } catch {
      // Clipboard is unavailable on a file:// origin in some browsers. Select
      // the text so the reader's own copy shortcut still works.
      textRef.current?.select();
      setCopyLabel("Press ⌘C");
    }
    setTimeout(() => setCopyLabel("Copy"), 1600);
  }

  function download() {
    const url = URL.createObjectURL(new Blob([text], { type: "text/markdown" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "ux-fixes.md";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <Dialog open={open} onClose={onClose} size="lg" initialFocusRef={textRef} className="p-0">
      <div className="flex items-baseline gap-3 border-b border-border px-4 py-3">
        <DialogTitle className="font-serif text-lg">Hand-off prompt</DialogTitle>
        <span className="text-sm text-muted-foreground">
          {counts.fix} to fix{counts.skip > 0 && `, ${counts.skip} declined`} · paste into a coding
          agent
        </span>
      </div>
      <Textarea
        ref={textRef}
        readOnly
        spellCheck={false}
        value={text}
        className="max-h-[52vh] min-h-96 resize-none rounded-none border-0 font-mono text-2xs"
      />
      <div className="flex items-center gap-2 border-t border-border px-4 py-3">
        <Button variant="outline" size="sm" onClick={copy}>
          {copyLabel}
        </Button>
        <Button variant="outline" size="sm" onClick={download}>
          Download .md
        </Button>
        <Button variant="ghost" size="sm" className="ml-auto" onClick={onClose}>
          Close
        </Button>
      </div>
    </Dialog>
  );
}

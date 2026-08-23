import { AlertTriangle, FileQuestion } from "lucide-react";
import type { ChangeDiff } from "@/lib/sync-api";
import { cn } from "@/lib/utils";

type DiffLine = {
  kind: "context" | "added" | "removed" | "hunk" | "meta";
  content: string;
  oldLine?: number;
  newLine?: number;
};

const HUNK_HEADER = /^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/;

export function parseUnifiedDiff(patch: string): DiffLine[] {
  const result: DiffLine[] = [];
  let oldLine = 0;
  let newLine = 0;
  let inHunk = false;

  for (const content of patch.split("\n")) {
    const hunk = content.match(HUNK_HEADER);
    if (hunk) {
      oldLine = Number(hunk[1]);
      newLine = Number(hunk[2]);
      inHunk = true;
      result.push({ kind: "hunk", content });
    } else if (inHunk && content.startsWith("+")) {
      result.push({ kind: "added", content, newLine: newLine++ });
    } else if (inHunk && content.startsWith("-")) {
      result.push({ kind: "removed", content, oldLine: oldLine++ });
    } else if (inHunk && content.startsWith(" ")) {
      result.push({ kind: "context", content, oldLine: oldLine++, newLine: newLine++ });
    } else {
      result.push({ kind: "meta", content });
    }
  }
  return result;
}

export function UnifiedDiffViewer({ diff }: { diff: ChangeDiff }) {
  const lines = parseUnifiedDiff(diff.patch);
  const additions = lines.filter((line) => line.kind === "added").length;
  const deletions = lines.filter((line) => line.kind === "removed").length;
  const hasHunks = lines.some((line) => line.kind === "hunk");
  const binary = diff.patch.includes("Binary files") || diff.patch.includes("GIT binary patch");
  const metadata = lines.filter((line) => line.kind === "meta" && line.content.trim().length > 0);

  return (
    <div className="min-w-0">
      <div className="flex items-center justify-between gap-4 border-b border-border bg-surface-muted px-4 py-2">
        <span className="truncate font-mono text-aux text-foreground" title={diff.path}>
          {diff.path}
        </span>
        {hasHunks ? (
          <span className="flex shrink-0 items-center gap-2 font-mono text-aux">
            <span className="text-success-fg">+{additions}</span>
            <span className="text-destructive-fg">−{deletions}</span>
          </span>
        ) : null}
      </div>

      {binary ? (
        <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
          <span className="flex size-10 items-center justify-center rounded-full bg-surface-muted">
            <FileQuestion className="size-5 text-muted-foreground" aria-hidden />
          </span>
          <p className="text-section text-foreground">Binary file changed</p>
          <p className="max-w-sm text-aux text-muted-foreground">
            Git detected a binary change, so there are no text lines to compare.
          </p>
        </div>
      ) : !hasHunks && metadata.length > 0 ? (
        <div className="bg-surface font-mono text-aux">
          <div className="border-b border-border px-4 py-2 font-sans text-aux text-muted-foreground">
            File metadata changed
          </div>
          <div
            className="max-h-[58vh] overflow-auto px-4 py-3"
            aria-label="File metadata changes"
            tabIndex={0}
          >
            {metadata.map((line, index) => (
              <div key={`${index}:${line.content}`} className="whitespace-pre text-foreground">
                {line.content}
              </div>
            ))}
          </div>
        </div>
      ) : !hasHunks ? (
        <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
          <span className="flex size-10 items-center justify-center rounded-full bg-surface-muted">
            <FileQuestion className="size-5 text-muted-foreground" aria-hidden />
          </span>
          <p className="text-section text-foreground">No textual differences to display</p>
          <p className="max-w-sm text-aux text-muted-foreground">
            Git did not return a textual patch for this change.
          </p>
        </div>
      ) : (
        <div className="max-h-[58vh] overflow-auto bg-surface font-mono text-aux" tabIndex={0}>
          <div className="min-w-max py-2">
            {lines.map((line, index) => {
              if (line.kind === "meta") return null;
              if (line.kind === "hunk") {
                return (
                  <div
                    key={`${index}:${line.content}`}
                    className="border-y border-info-border bg-info-bg px-4 py-1 text-info-fg"
                  >
                    {line.content}
                  </div>
                );
              }
              return (
                <div
                  key={`${index}:${line.content}`}
                  className={cn(
                    "flex min-h-5",
                    line.kind === "added" && "bg-success-bg/70 text-success-fg",
                    line.kind === "removed" && "bg-destructive-bg/70 text-destructive-fg",
                    line.kind === "context" && "text-foreground",
                  )}
                >
                  <span className="w-12 shrink-0 select-none border-r border-border-subtle px-2 text-right text-subtle-foreground">
                    {line.oldLine ?? ""}
                  </span>
                  <span className="w-12 shrink-0 select-none border-r border-border-subtle px-2 text-right text-subtle-foreground">
                    {line.newLine ?? ""}
                  </span>
                  <span className="whitespace-pre px-3 pr-8">{line.content || " "}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {diff.truncated ? (
        <div className="flex items-center gap-2 border-t border-warning-border bg-warning-bg px-4 py-2 text-aux text-warning-fg">
          <AlertTriangle className="size-3.5 shrink-0" aria-hidden />
          This diff is very large, so only the first part is shown.
        </div>
      ) : null}
    </div>
  );
}

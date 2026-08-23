import { Fragment, type ReactNode } from "react";

/**
 * The one inline syntax audit prose uses: `code` and **bold**.
 *
 * Findings are written once and consumed twice — rendered on the page and
 * serialized into the hand-off prompt — so the source has to be plain strings.
 * Markdown's own syntax is the natural choice: the export passes it through
 * untouched, and this renders it.
 */
const TOKEN = /(`[^`]+`|\*\*[^*]+\*\*)/g;

export function inline(text: string): ReactNode {
  return text.split(TOKEN).map((part, i) => {
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code key={i} className="rounded bg-surface-muted px-1 py-0.5 font-mono text-2xs">
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith("**") && part.endsWith("**")) {
      // Recurse: emphasis routinely wraps an identifier, and the outer match
      // swallows the backticks with it.
      return (
        <b key={i} className="font-medium text-foreground">
          {inline(part.slice(2, -2))}
        </b>
      );
    }
    return <Fragment key={i}>{part}</Fragment>;
  });
}

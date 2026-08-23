import { useState } from "react";
import { Button } from "@rome-os/ui/button";
import type { ReproMode } from "./types";

/**
 * Example reproduction — the committed stand-in for the per-audit `repros.tsx`
 * (gitignored; seeded from this file by `build.mjs` / `typecheck.mjs` when
 * missing — see findings.example.tsx).
 *
 * The two rules that keep real repros trustworthy: build from real
 * `@rome-os/ui` primitives (never a hand-drawn lookalike), and let the
 * "shipped" branch actually misbehave the way the code does — doing nothing at
 * all when that is the bug.
 */

/** Editorial gloss on what the reader is looking at. Never product chrome. */
function Note({ tone = "bad", children }: { tone?: "bad" | "good"; children: React.ReactNode }) {
  return (
    <p
      className={`mt-2.5 rounded-md px-2.5 py-2 text-xs ${
        tone === "good" ? "bg-success-bg text-success-fg" : "bg-destructive-bg text-destructive-fg"
      }`}
    >
      {children}
    </p>
  );
}

export function ExampleRepro({ mode }: { mode: ReproMode }) {
  const [tried, setTried] = useState(false);
  return (
    <div>
      <div className="flex items-center gap-3">
        <span className="flex-1 text-sm font-medium">Example setting</span>
        <Button size="sm" onClick={() => setTried(true)}>
          Save
        </Button>
      </div>
      {tried && mode === "fixed" && (
        <p className="mt-2 text-xs text-destructive-fg">Couldn&rsquo;t save. Try again.</p>
      )}
      {tried &&
        (mode === "shipped" ? (
          <Note>The save failed and the UI said nothing — doing nothing is the finding.</Note>
        ) : (
          <Note tone="good">The failure is stated where the action lives.</Note>
        ))}
    </div>
  );
}

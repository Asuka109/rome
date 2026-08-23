import { ExampleRepro } from "./repros.example";
import type { AuditReport } from "./types";

/**
 * Example report — the committed stand-in for the per-audit `findings.tsx`.
 *
 * The real `findings.tsx` / `repros.tsx` are per-run outputs: gitignored, and
 * seeded from these examples by `build.mjs` / `typecheck.mjs` when missing.
 * An audit rewrites them in place; this file exists so the report app always
 * compiles and so the authoring shape has one worked reference. Keep it to a
 * single minimal finding — it is a template, not an archive.
 *
 * Prose fields take Markdown inline syntax (`` `code` ``, `**bold**`) — the
 * same string renders on the page and serializes into the exported prompt.
 */
export const report: AuditReport = {
  route: "/example",
  headline: "What breaks on",
  standfirst:
    "One placeholder finding demonstrating the report shape. Flip **As shipped / Fixed** on the panel, mark it **Fix** or **Won't fix**, then export the calls as a ready-to-paste prompt.",
  summary: [
    "Open with the pattern behind the findings, not a list. Two short paragraphs at most — the second names the single highest-leverage fix.",
  ],

  findings: [
    {
      // Stable slug — triage decisions persist against it in localStorage.
      id: "example-finding",
      severity: "warn",
      rule: "rule-id-from-the-ruleset",
      surface: "Example surface",
      title: "One-line claim, stated as a defect",
      why: [
        "First paragraph: what the code does and why that is wrong, tied to **this** code — not a recital of the rule.",
        "Second paragraph (optional): the consequence a user actually experiences.",
      ],
      evidence: {
        where: "packages/web/src/pages/Example.tsx:1-2",
        code: `<Button onClick={() => void save()}>Save</Button>  // no error branch`,
      },
      fix: "The concrete change, in terms of this codebase — small enough to act on without re-deriving the analysis.",
      repro: {
        label: "rome-web · /example",
        hint: "**Click the button.** As shipped, nothing tells you the save failed.",
        render: (mode) => <ExampleRepro mode={mode} />,
      },
    },
  ],

  keep: [
    {
      lead: "Something the design gets right",
      body: "Named so the consuming agent doesn't regress it while fixing the findings.",
    },
  ],

  declined: [
    {
      lead: "A candidate examined and not flagged",
      body: "With the exception or reason — this section teaches the boundaries and builds trust in the flags that remain.",
    },
  ],

  groundRules: [
    "Follow `docs/design-system.md`: semantic tokens only, `ui/` primitives over hand-rolled elements.",
    "Keep each fix to the smallest change that resolves the finding.",
  ],

  footer:
    "Replace every field above when authoring a real audit — see references/report-app.md for the contract.",
};

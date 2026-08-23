# Building the shareable report

The report app lives in `report/`, beside this skill. It is audit tooling and its findings are audit output, so neither belongs in rome-web's source tree — but it still *compiles against* rome-web, because the whole argument of a report is that the reproductions are the real components.

```
node .claude/skills/ux-semantics-audit/report/build.mjs           # -> report/dist-report/index.html
node .claude/skills/ux-semantics-audit/report/build.mjs --dev     # dev server, localhost:3300
node .claude/skills/ux-semantics-audit/report/typecheck.mjs
```

Both scripts resolve rsbuild and tsc from `packages/web/node_modules` and pass the workspace path in — run `pnpm install` at the repo root first if either complains.

The build emits **one self-contained file** — scripts, styles and fonts inlined, no external requests — so the output can be attached to a message or opened offline.

## What you write, and what you don't

| File | Who owns it |
|---|---|
| `findings.tsx` | **You.** The audit itself. Rewrite per audit — **gitignored**, never committed. |
| `repros.tsx` | **You.** One component per finding. Also gitignored. |
| `findings.example.tsx`, `repros.example.tsx` | Committed stand-ins: the minimal worked template, and what `build.mjs`/`typecheck.mjs` seed the real files from on a fresh checkout. Update only when the *authoring shape* changes. |
| `Report.tsx`, `prompt.ts`, `prose.tsx`, `types.ts` | Fixed. Leave them alone unless the *format* is changing. |
| `rsbuild.config.ts`, `postcss.config.mjs`, `styles.css`, `tsconfig.json`, `build.mjs`, `typecheck.mjs` | Build plumbing. Every non-obvious line is commented; read before changing. |

`findings.tsx` and `repros.tsx` are per-run outputs, not source: audit content never lands in git (a repo carrying its own stale audit as code is worse than no report). If they're missing, either script re-seeds them from the examples; authoring an audit means overwriting whatever run currently occupies them — deliver the built HTML, not the source.

Never hand-author a report page. If a finding needs something the chrome can't express, that's a change to `Report.tsx` for every future report — not a bespoke page.

## findings.tsx

Fill in the `AuditReport` type from `types.ts`. It carries the headline, standfirst, summary, findings, "passes worth keeping", "examined and not flagged", and the ground rules appended to the exported prompt.

Per finding: `id`, `severity`, `rule`, `surface`, `title`, `why[]`, `evidence {where, code}`, `fix`, and an optional `repro`.

Three things matter:

- **`id` is stable.** Triage decisions persist against it in localStorage. Renaming an id silently discards a reader's decision.
- **Prose fields are Markdown-flavoured strings, not JSX.** `` `code` `` and `**bold**` render on the page and pass through to the prompt unchanged. This is why there is exactly one copy of every sentence — nothing to keep in sync.
- **`surface` doubles as the filter value.** Keep the set small and consistent; a surface per finding makes the filter useless.

Order findings the way they should be worked: every `block` first, then `warn`, each group by user impact against fix cost.

## repros.tsx

The reproduction is the argument. A reader who clicks the button watches the defect happen instead of reading a claim that it does. Two rules keep that trustworthy:

**Render real components.** Import from `@rome-os/ui/*`, and from `@/…` for real app components (`StatusIndicator` is a good example). A hand-drawn lookalike stops matching the product the first time the kit changes, and then the report is lying. The one exception is a finding *about* hand-rolled markup — reproducing finding "the dialog is a bare div" means rendering a bare div, because that is what the code does. Say so in a comment.

**Let "as shipped" actually misbehave.** If the bug is that a failed request produces no feedback, the shipped branch must produce no feedback. Doing nothing is the finding.

Each repro is `(mode: ReproMode) => ReactNode` where mode is `"shipped" | "fixed"`. Anything with internal state goes in its own component taking `{ mode }`. Where an interaction exposes the defect, add a control that triggers it and describe the click in `repro.hint` — "make the request fail", "click Log Out on both rows", "hit Squint test".

Add a short editorial `Note` under the surface when the defect needs naming — but never dress it as product chrome, or the reader can't tell the report from the thing being reported on.

## Gotchas the build already handles

Don't re-solve these; they're configured in `rsbuild.config.ts` with comments:

- **`html.inject: "body"`** — `defer` is ignored on inline scripts, so a head-injected bundle runs before `#root` exists and the page renders blank.
- **KaTeX fonts are stripped in postcss.** `globals.css` reaches the chat markdown surface, which imports KaTeX and its twenty `@font-face` rules — about a megabyte of base64'd maths glyphs in a report that renders no maths. It has to be filtered by font-family: Rspack inlines CSS `@import` in its own parser, ahead of `resolve.alias`, module-graph plugins and postcss, so by the time any hook runs the at-rule is gone and only its contents remain.
- **`chunkSplit: "all-in-one"`** — inlining needs a single chunk.
- **`@rome-os/ui` must be built** (`dist/`) before the report builds — the same prerequisite the SPA has. `pnpm install` covers it via the package's `prepare` script.
- **Living outside the workspace costs four wires**, all in place: `resolve.modules` for node resolution, a local `postcss.config.mjs` (rsbuild looks for one relative to the build root, and without it Tailwind never runs and the page renders with no layout at all), a *relative* `@import` of `globals.css` in `styles.css` (CSS imports are inlined before `resolve.alias` applies), and `@source` entries for this directory and `packages/web/src` (a class used only inside an app component the repros render — `border-muted-foreground/40` — is otherwise dropped silently).

## Before you call it done

- `node .claude/skills/ux-semantics-audit/report/typecheck.mjs`
- `biome check .claude/skills/ux-semantics-audit/report`
- Build, open the file, and exercise at least the interactive repros. The reproductions are the report's entire claim to being evidence; a repro that doesn't do what its hint says is worse than no repro.

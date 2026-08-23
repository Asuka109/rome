# Morning Brief

A **runnable example workflow app**. It is *not* a first-party app — it is not
packed or installed at boot. Instead it lives under `example_apps/` and serves
two audiences:

- **The coding agent** reads it as the canonical worked example for the
  `coding:workflow_creation` skill (referenced by path from its `SKILL.md`).
- **People** get it seeded at
  `~/.rome/<profile>/projects/example-apps/morning-brief` as an **editable
  starter** (copy-if-missing, never clobbered). Open it, build it, and install it
  via the normal app-creation flow to see a workflow run end to end — it uses
  built-in fixtures, so it works with zero setup.

## What it demonstrates

The whole automation is one function — `src/workflow/definition.ts`'s
`runWorkflow(input, ctx)` — written as **plain TypeScript control flow** (there
is no combinator tree). In order, it shows every shape the skills describe:

| Shape | In the demo |
| --- | --- |
| **sequence** | `await` each step, threading results through `const`s |
| **concurrency** | `Promise.all([...])` gathers calendar + tasks + headlines at once |
| **fan-out (map)** | `tasks.map(scoreTask)` scores each task |
| **fold (reduce)** | `scored.reduce(...)` counts the urgent ones |
| **decision (branch)** | `if (urgentCount >= …)` picks the brief's tone |
| **generate (summon)** | ONE `ctx.runAction("system:summon", …)` writes the brief |
| **external write** | `deliverBrief` is **dry-run guarded** (`if (ctx.dryRun)`) |

## How it maps to a real workflow

Every external **read** is an in-file **fixture** (`fetchCalendar`, `fetchTasks`,
`fetchHeadlines`) returning the shape a connector call would. In a real workflow
you'd swap each for a `ctx.runAction("connector:connector_proxy", { toolkit, path, method })`
— see the `coding:workflow_creation` skill's "Connector steps". The `system:summon` call
is the one genuinely live piece; it runs `assistant:assistant`.

## Shape of the app (the workflow template, nothing bespoke)

- `src/workflow/definition.ts` — the workflow (the only file that differs per app).
- `src/workflow/context.ts` — the `WorkflowContext`/`Json` types the app owns.
- `src/actions/run/` — the run action that calls `runWorkflow` and records the run.
- `src/db/` — the `runs` history table + migrations (the shell records every run).
- `src/api/index.ts` — `POST /run` (trigger) and `GET /runs` (history feed).
- `src/web/App.tsx` — the run page + "Recent runs" list.

It runs **on demand** and returns its result; the page also lists recent runs.

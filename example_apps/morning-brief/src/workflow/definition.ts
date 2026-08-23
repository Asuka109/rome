import { type Json, type WorkflowContext } from "./context.js";

// ============================================================================
// Morning Brief
//
// A runnable REFERENCE workflow. It shows the shapes the
// `coding:workflow_creation` skill describes, written as PLAIN TYPESCRIPT control flow
// (there is no combinator tree): sequencing with `await`, concurrency with
// `Promise.all`, per-item fan-out with `.map`, a fold with `.reduce`, a decision
// with `if`/`else`, ONE generative `system:summon` call, and a dry-run-guarded delivery.
//
// Every external READ here is a clearly-labeled in-file FIXTURE so the demo runs
// with zero setup (no connected toolkits). In a real workflow you'd swap each
// fixture for a `ctx.runAction("connector:connector_proxy", …)` of the same shape
// (see the coding:workflow_creation skill's "Connector steps"). The one genuinely live
// call is `system:summon`, which writes the brief.
// ============================================================================

interface CalendarEvent {
  title: string;
  start: string;
}
interface Task {
  title: string;
  due: "today" | "tomorrow" | "later";
  importance: number; // 0..1
}
interface Headline {
  title: string;
  source: string;
}

/** How many urgent tasks tip the brief from "calm" into "heads-up". */
const URGENT_THRESHOLD = 2;

// --- Fixtures (stand in for connector reads) --------------------------------
// Each returns the shape a real connector call would, so swapping in
// `ctx.runAction("connector:connector_proxy", …)` later is a drop-in.

async function fetchCalendar(): Promise<CalendarEvent[]> {
  return [
    { title: "Standup", start: "09:30" },
    { title: "Design review", start: "11:00" },
    { title: "1:1 with Sam", start: "15:00" },
  ];
}

async function fetchTasks(): Promise<Task[]> {
  return [
    { title: "Ship the release notes", due: "today", importance: 0.9 },
    { title: "Reply to the vendor", due: "today", importance: 0.6 },
    { title: "Plan next sprint", due: "tomorrow", importance: 0.7 },
    { title: "Tidy the backlog", due: "later", importance: 0.3 },
  ];
}

async function fetchHeadlines(): Promise<Headline[]> {
  return [
    { title: "New TypeScript release lands", source: "Dev Weekly" },
    { title: "Team offsite confirmed for next month", source: "Internal" },
  ];
}

/** Plain glue: blend a task's importance with how soon it's due into a 0..1
 * urgency score. Pure code — no actions, no IO. */
function scoreTask(task: Task): number {
  const proximity = task.due === "today" ? 1 : task.due === "tomorrow" ? 0.6 : 0.2;
  return Math.min(1, task.importance * 0.5 + proximity * 0.5);
}

/** Deliver the finished brief. EXTERNAL-WRITE step, so it is dry-run guarded: a
 * verification/preview run (`ctx.dryRun`) must not perform a real write. In a
 * real workflow the live branch would be
 * `await ctx.runAction("system:send_message", { text: brief })`; here it's a fixture so
 * the demo needs no channel configured. */
async function deliverBrief(
  brief: string,
  ctx: WorkflowContext,
): Promise<{ delivered: boolean; via: string }> {
  if (ctx.dryRun) return { delivered: false, via: "skipped (dry run)" };
  ctx.log.info("delivering morning brief", { length: brief.length });
  return { delivered: true, via: "fixture:chat" };
}

// Accept either a bare string (what the run page sends) or a `{ focus }` object
// (what a routine might pass) — a small example of tolerating both input shapes.
function readFocus(input: Json): string | null {
  if (typeof input === "string" && input.trim()) return input.trim();
  if (input && typeof input === "object" && "focus" in input) {
    const focus = (input as { focus?: unknown }).focus;
    if (typeof focus === "string" && focus.trim()) return focus.trim();
  }
  return null;
}

export async function runWorkflow(input: Json, ctx: WorkflowContext): Promise<Json> {
  const focus = readFocus(input);

  // 1. CONCURRENCY — gather three independent sources at once. Genuinely
  //    independent reads belong in `Promise.all`, not sequential `await`s.
  const [events, tasks, headlines] = await Promise.all([
    fetchCalendar(),
    fetchTasks(),
    fetchHeadlines(),
  ]);

  // 2. FAN-OUT (map) — score every task. This per-item work is pure, so a plain
  //    `.map` is right; if each item needed an action call you'd
  //    `await Promise.all(tasks.map(async (t) => …))` instead.
  const scored = tasks.map((task) => ({ ...task, score: scoreTask(task) }));

  // 3. FOLD (reduce) — collapse the scored tasks into one number: how many are
  //    urgent. Folds are plain code too.
  const urgentCount = scored.reduce((n, task) => (task.score >= 0.7 ? n + 1 : n), 0);

  // 4. DECISION (branch) — pick the brief's tone from the fold. A conditional is
  //    just `if`/`else` over the values in scope.
  let tone: string;
  if (urgentCount >= URGENT_THRESHOLD) {
    tone = "Lead with a clear heads-up — today is busy.";
  } else {
    tone = "Keep it calm and encouraging.";
  }

  // 5. GENERATE (`system:summon`) — ONE live call writes the brief from everything above.
  //    `system:summon` is the only path to an LLM. Keep it a single, sequential call —
  //    never fan it across the map/Promise.all above (issue #639).
  //
  //    `system:summon` resolves to `{ result, sessionId, output? }` — the generated prose
  //    is `result`, NOT the whole object. Pull it out (and validate it) before
  //    using it, or you'd return/deliver the metadata object by mistake.
  const summon = (await ctx.runAction("system:summon", {
    agentName: "assistant:assistant",
    prompt: [
      "Write a short, friendly morning brief for me. A few sentences, no preamble.",
      tone,
      focus ? `I especially care about: ${focus}.` : "",
      `Today's calendar: ${JSON.stringify(events)}`,
      `My tasks, with 0..1 urgency scores: ${JSON.stringify(scored)}`,
      `Headlines worth a mention: ${JSON.stringify(headlines)}`,
    ]
      .filter(Boolean)
      .join("\n"),
  })) as { result?: unknown };
  if (typeof summon.result !== "string" || !summon.result.trim()) {
    throw new Error("summon did not return brief text");
  }
  const brief = summon.result.trim();

  // 6. EXTERNAL WRITE (dry-run guarded) — deliver the brief and report the outcome.
  const delivery = await deliverBrief(brief, ctx);

  // Return a DISPLAY ENVELOPE: the page renders `message` (the brief itself), with
  // the structured fields tucked behind "Details". See workflow_creation.
  return { ok: true, message: brief, focus, tone, urgentCount, scored, delivery };
}

// The welcome-to-rome conversation as a state machine. Each user
// turn, `runTurn` reads the persisted node, decides what the turn should emit
// (a text block or one of the app's own inline components), advances the node,
// and returns it. Two intro branches:
//
//   • Import from ChatGPT — guide the guardian to open the Desktop browser,
//     drive the server Chrome to ChatGPT (CDP), wait for sign-in, scrape what
//     ChatGPT remembers. Zero-model.
//   • Answer questions — show the host's built-in ask_question card (a fixed
//     question set) and read the answers back.
//
// Both branches end the same way: fold the gathered text into memory by
// summoning `welcome-memory` INLINE (no child session/approval), then summon the
// idea specialist INLINE and show the idea picker → done. Everything the heavy
// steps need is a blocking `summon`; nothing hands off anymore. The middleware
// (index.ts) turns each reply into events; this file owns *what to show / ask,
// and when*.

import { copy, type CompletionProps } from "./copy.js";
import type { AppIdea, ProgressRepository } from "../../db/repositories/progress.js";
import { encodeIdeas } from "../../db/repositories/progress.js";
import { isDismissedInteraction, readResolutionJson } from "./resolution.js";
import type { AskQuestion } from "./component.js";
import { scoutSuggestionsFromBasis, type ScoutSuggestion } from "./scout-suggestions.js";

const MEMORY_AGENT = "welcome-memory";
const IDEAS_AGENT = "welcome-app-ideas";

/** Idea-picker opt-out sentinel (must match src/web/idea-picker.tsx). */
const EXPLORE = "__explore__";

/** What one turn should emit. */
export type TurnReply =
  | { kind: "text"; text: string }
  // One of welcome-to-rome's own inline components; its result returns next turn.
  | { kind: "component"; lead?: string; componentId: string; props: Record<string, unknown> }
  // The host's built-in ask_question card; its answers return as the next turn.
  | { kind: "ask"; lead?: string; questions: AskQuestion[] };

/** Result of driving ChatGPT in the server browser. */
export interface ChatGptScrape {
  ok: boolean;
  reply?: string;
  noMemory?: boolean;
  reason?: string;
}

/** Result of summoning a specialist agent inline (blocking). */
export interface SummonResult {
  ok: boolean;
  /** Validated structured output, e.g. `{ ideas: [...] }`. */
  output: unknown;
}

/** The side-effect / output port the state machine drives. Kept abstract so the
 *  machine is testable without the AgentSession or a live browser. */
export interface WelcomeEffects {
  progress: ProgressRepository;
  /** Read the guardian-chosen name for the main agent, falling back to Rome. */
  getAgentName(): Promise<string>;
  /** Emit an intermediate narration block (commentary), typed out word by word.
   *  Resolves once the whole block has streamed, so callers `await` it to keep
   *  ordering against later emits. */
  say(text: string): Promise<void>;
  /** Run a specialist agent inline (no child session / approval) and return its
   *  structured output. Used for autonomous steps like the idea brainstorm. */
  summon(agentName: string, prompt: string): Promise<SummonResult>;
  chatgpt: {
    openTab(): Promise<void>;
    checkLogin(): Promise<{ loggedIn: boolean; reason: string }>;
    scrape(): Promise<ChatGptScrape>;
  };
  /** Send the onboarding "hello" email — a deterministic script step (no model),
   *  implemented over the `send_message` action. `to` is the guardian's address
   *  or the literal "guardian" (the email channel resolves it). */
  email: {
    send(to: string, subject: string, text: string): Promise<{ ok: boolean }>;
  };
}

// Generic starter ideas, used when the brainstorm specialist is unavailable or
// hands back nothing usable — onboarding should still hand the guardian a first win.
const GENERIC_IDEAS: AppIdea[] = [
  {
    title: "Mood diary",
    prompt:
      "Build me a diary app where I can record my mood, events, people, and notes each day. Give me a calendar view, searchable entries, and simple weekly mood trends so I can reflect on patterns over time.",
  },
  {
    title: "Habit garden",
    prompt:
      "Build me a habit tracker where I can define a few recurring habits, check them off daily, and see streaks and weekly progress in a friendly dashboard.",
  },
  {
    title: "Reading shelf",
    prompt:
      "Build me a reading-list app where I can paste links, add notes and tags, mark items as reading or finished, and browse everything later by topic or status.",
  },
];

function ideasFromSummon(output: unknown): AppIdea[] {
  const raw =
    output && typeof output === "object" ? (output as Record<string, unknown>).ideas : null;
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item) =>
    item &&
    typeof item === "object" &&
    typeof (item as AppIdea).title === "string" &&
    typeof (item as AppIdea).prompt === "string"
      ? [{ title: (item as AppIdea).title, prompt: (item as AppIdea).prompt }]
      : [],
  );
}

// The summon prompt fed to `welcome-memory`. Its system prompt already carries
// the full fold-into-memory instructions, so this just frames + carries the
// source text (a ChatGPT export, or the formatted questionnaire answers).
function memoryPrompt(source: string): string {
  return [
    "Here is what we just learned about the guardian. Fold the useful facts into",
    "their memory per your instructions, then call submit_output with { summary }.",
    "",
    source,
  ].join("\n");
}

/** Render the questionnaire answers into a readable block for the memory agent.
 *  Values are already strings (the ask_question card joins multi-select with
 *  ", "); blank/omitted answers simply don't appear. */
function formatAnswers(answers: Record<string, string>): string {
  const lines: string[] = [];
  if (answers.role) lines.push(`Role / field: ${answers.role}`);
  if (answers.interests) lines.push(`Interested in: ${answers.interests}`);
  if (answers.helpFirst) lines.push(`Wants help with first: ${answers.helpFirst}`);
  if (answers.commStyle) lines.push(`Preferred communication style: ${answers.commStyle}`);
  if (answers.anythingElse) lines.push(`Anything else: ${answers.anythingElse}`);
  return lines.join("\n");
}

function ideasBrief(basis: string): string {
  return [
    "Brainstorming your first apps to build.",
    "",
    "From what Rome learned about the guardian below, brainstorm a few concrete, personalized first apps, then hand back the idea tuples via submit_output.",
    "",
    basis,
  ].join("\n");
}

/** The greeting (text) + the two-way intro choice component. */
/** The email handshake card (the first step): shows the agent's + guardian's
 *  addresses and an "agree & send" button. The card itself reads identity and
 *  provisions if needed (via core APIs); the script sends the hello on agree. */
async function emailHandshakeReply(fx: WelcomeEffects): Promise<TurnReply> {
  return {
    kind: "component",
    lead: copy.emailIntro(await fx.getAgentName()),
    componentId: "email-handshake",
    props: {},
  };
}

/** The "check your inbox" card shown after the hello is sent. */
function receiptReply(guardianEmail: string): TurnReply {
  return {
    kind: "component",
    lead: copy.emailSentLead,
    componentId: "email-receipt",
    props: { guardianEmail },
  };
}

function greetReply(): TurnReply {
  return { kind: "component", lead: copy.greet, componentId: "intro-choice", props: {} };
}

/** The "open the browser, then continue" component (ChatGPT-import branch). */
function browserStep(notSignedIn = false): TurnReply {
  return { kind: "component", componentId: "browser-step", props: { notSignedIn } };
}

// The fixed getting-to-know-you questionnaire, shown as the host's built-in
// ask_question card (one card, mostly tap-to-answer with a free-text box). The
// set mirrors what the old `introductions` agent asked. Answers return next turn
// as `{ answers: [{ questionId, value }] }`.
const INTRO_QUESTIONS: AskQuestion[] = [
  {
    id: "role",
    question: "What's your role or field?",
    type: "single",
    freeText: true,
    options: [
      "Engineering",
      "Design",
      "Product",
      "Founder / business",
      "Research",
      "Operations",
      "Marketing / content",
    ],
  },
  {
    id: "interests",
    question: "What are you into? Pick as many as apply.",
    type: "multi",
    freeText: true,
    options: [
      "Software & engineering",
      "AI & machine learning",
      "Data & analytics",
      "Science & research",
      "Design & UX",
      "Product & strategy",
      "Business & entrepreneurship",
      "Finance & investing",
      "Marketing & growth",
      "Writing & content",
      "Education & learning",
      "Health & fitness",
      "Productivity & organization",
    ],
  },
  {
    id: "helpFirst",
    question: "What would you love help with first?",
    type: "single",
    freeText: true,
    options: [
      "Email & messages",
      "Research & summaries",
      "Writing & content",
      "Scheduling & reminders",
      "Building little tools",
    ],
  },
  {
    id: "commStyle",
    question: "How should Rome talk to you?",
    type: "single",
    freeText: true,
    options: [
      "Short & to the point",
      "Detailed & thorough",
      "Casual & friendly",
      "Formal & professional",
    ],
  },
  {
    id: "anythingElse",
    question: "Anything else I should know?",
    type: "text",
    optional: true,
  },
];

/** The fixed getting-to-know-you questionnaire (built-in ask_question card).
 *  Resolves next turn with `{ answers: [{ questionId, value }] }`. */
function introQuestions(): TurnReply {
  return { kind: "ask", lead: copy.questionsLead, questions: INTRO_QUESTIONS };
}

/** The "pick your first app" buttons (the ideas themselves render above as a
 *  markdown text message). Each "Build this" opens a fresh chat client-side;
 *  only the explore opt-out resolves this turn. */
function ideaPicker(ideas: AppIdea[]): TurnReply {
  return { kind: "component", componentId: "idea-picker", props: { ideas } };
}

function scoutSuggestions(scouts: ScoutSuggestion[]): TurnReply {
  return {
    kind: "component",
    lead: copy.scoutsLead,
    componentId: "scout-suggestions",
    props: { scouts },
  };
}

/** The completion component (closing message + copyable kickoff + revisit). */
function completionCard(props: CompletionProps): TurnReply {
  return { kind: "component", componentId: "completion-card", props: { ...props } };
}

const FRESH_PROGRESS = {
  introRawInput: null,
  introSummary: null,
  appIdeas: null,
  appIdeasGeneratedAt: null,
  completedAt: null,
} as const;

/** Read a string field from a resolved component's submitted output. */
function field(userText: string, key: string): string | null {
  const v = readResolutionJson(userText)?.[key];
  return typeof v === "string" ? v : null;
}

/**
 * Run one user turn through the state machine. Returns what the turn should emit;
 * the caller (index.ts) turns it into events.
 */
export async function runTurn(userText: string, fx: WelcomeEffects): Promise<TurnReply> {
  const p = fx.progress.get();
  const now = () => new Date().toISOString();

  switch (p.node) {
    case "greet": {
      // First contact: greet + the email handshake (the first onboarding step,
      // before getting-to-know-you). The kickoff message the user typed to open
      // the conversation is intentionally not consumed.
      fx.progress.patch({ node: "await_email" });
      return emailHandshakeReply(fx);
    }

    case "await_email": {
      // The handshake card resolves with `{ agreed, guardianEmail }` once the
      // guardian confirms, or `{ skip }` when email isn't available in this
      // environment (or they opt out). Skip / dismiss → straight to getting to
      // know you.
      const res = readResolutionJson(userText);
      if (res?.skip === true || isDismissedInteraction(userText)) {
        fx.progress.patch({ node: "await_choice" });
        return greetReply();
      }
      // Only an explicit `{ agreed: true }` from the card sends mail. Anything
      // else — free text like "why do I need this?", or a malformed resolution —
      // must not fire an email; re-show the handshake and wait for a real choice.
      if (res?.agreed !== true) {
        return emailHandshakeReply(fx);
      }
      // Agreed: send the hello (script, no model). On failure, don't pretend a
      // mail is coming — just move on.
      const to = field(userText, "guardianEmail") ?? "guardian";
      const agentName = await fx.getAgentName();
      const sent = await fx.email.send(to, copy.helloEmailSubject, copy.helloEmailBody(agentName));
      if (!sent.ok) {
        fx.progress.patch({ node: "await_choice" });
        return greetReply();
      }
      fx.progress.patch({ node: "await_email_receipt" });
      return receiptReply(to);
    }

    case "await_email_receipt": {
      // The receipt card resolves with `{ received }` / `{ skip }` (both move on)
      // or `{ resend }` (send again, re-show the card). Confirming receipt is
      // optional — either button continues.
      const res = readResolutionJson(userText);
      if (res?.resend === true) {
        const to = field(userText, "guardianEmail") ?? "guardian";
        const agentName = await fx.getAgentName();
        await fx.email.send(to, copy.helloEmailSubject, copy.helloEmailBody(agentName));
        return receiptReply(to);
      }
      fx.progress.patch({ node: "await_choice" });
      return greetReply();
    }

    case "await_choice": {
      const choice = field(userText, "choice") ?? normalize(userText);
      if (/import|chatgpt/.test(choice)) {
        // Pre-open ChatGPT in the server Chrome so it's already showing when the
        // guardian opens the Browser widget. Best-effort.
        await fx.chatgpt.openTab().catch(() => {});
        fx.progress.patch({ node: "await_browser" });
        return browserStep();
      }
      if (/answer|question/.test(choice)) {
        fx.progress.patch({ node: "await_questions" });
        return introQuestions();
      }
      return greetReply();
    }

    case "await_browser": {
      const action = field(userText, "action") ?? normalize(userText);
      if (/skip/.test(action)) {
        fx.progress.patch({ node: "await_questions" });
        return introQuestions();
      }
      // "Continue": confirm sign-in, then scrape.
      const login = await fx.chatgpt.checkLogin();
      if (!login.loggedIn) {
        return browserStep(true);
      }
      await fx.say(copy.magicTrick);
      const scrape = await fx.chatgpt.scrape();
      if (scrape.ok && scrape.reply) {
        // Fold the export into memory inline, then continue in this same turn.
        fx.progress.patch({ introRawInput: scrape.reply });
        await foldMemory(fx, scrape.reply);
        return continueAfterMemory(fx, now);
      }
      // No memory stored, or the scrape failed — fall back to the questionnaire.
      await fx.say(scrape.noMemory ? copy.chatgptNoMemory : copy.chatgptFailed);
      fx.progress.patch({ node: "await_questions" });
      return introQuestions();
    }

    case "await_questions": {
      // The built-in question card resolves with `{ answers: [...] }`. A
      // dismissal means the guardian opted out — move on. But plain typed text
      // (they wrote in the composer instead of submitting the card) is NOT a
      // completed questionnaire: re-show the card and stay parked, so their
      // input isn't dropped and onboarding doesn't jump ahead.
      if (isDismissedInteraction(userText)) {
        return continueAfterMemory(fx, now);
      }
      const answers = readAnswers(userText);
      if (!answers) {
        return introQuestions();
      }
      // A real submission — fold the answers into memory inline (an all-blank
      // submit yields no source and just continues), then continue this turn.
      const source = formatAnswers(answers);
      if (source) {
        fx.progress.patch({ introRawInput: source });
        await foldMemory(fx, source);
      }
      return continueAfterMemory(fx, now);
    }

    case "await_scouts": {
      return brainstormAppIdeas(fx, now);
    }

    case "await_idea": {
      const ideas = p.ideas.length > 0 ? p.ideas : GENERIC_IDEAS;
      const idea = resolveChosenIdea(userText, ideas);
      fx.progress.patch({ node: "done", completedAt: now() });
      return completionCard(idea ? copy.pickedIdea(idea) : copy.finishedNoPick);
    }

    case "done":
    default: {
      // The "run again" button (or a typed "start over") resets and re-greets.
      if (readResolutionJson(userText)?.revisit === true || isRestart(userText)) {
        fx.progress.patch({ node: "await_choice", ...FRESH_PROGRESS });
        return greetReply();
      }
      return completionCard(copy.alreadyDone);
    }
  }
}

/** Read the built-in ask_question answers (`{ answers: [{ questionId, value }] }`)
 *  from a resolution turn into a `{ [questionId]: value }` map. */
function readAnswers(userText: string): Record<string, string> | null {
  const raw = readResolutionJson(userText)?.answers;
  if (!Array.isArray(raw)) return null;
  const map: Record<string, string> = {};
  for (const a of raw) {
    if (a && typeof a === "object") {
      const id = (a as Record<string, unknown>).questionId;
      const value = (a as Record<string, unknown>).value;
      if (typeof id === "string" && typeof value === "string") map[id] = value;
    }
  }
  return map;
}

/** Pull the `{ summary }` string out of a `welcome-memory` summon's output. */
function summaryFromSummon(output: unknown): string | null {
  const s =
    output && typeof output === "object" ? (output as Record<string, unknown>).summary : null;
  return typeof s === "string" ? s : null;
}

/** Fold `source` into the guardian's memory by summoning `welcome-memory` INLINE
 *  (no child session/approval), narrating the brief wait. The summon writes the
 *  memory files itself; we keep its returned summary for the takeaway. Best
 *  effort — a failed summon just leaves `introSummary` unset and the brainstorm
 *  falls back to the raw input. */
async function foldMemory(fx: WelcomeEffects, source: string): Promise<void> {
  await fx.say(copy.savingMemoryLead);
  const summoned = await fx.summon(MEMORY_AGENT, memoryPrompt(source));
  const summary = summoned.ok ? summaryFromSummon(summoned.output) : null;
  if (summary) fx.progress.patch({ introSummary: summary });
}

/** Shared tail of both intro branches: surface the memory takeaway, then either
 *  offer briefing scouts or go straight to the first-app brainstorm. Runs inline
 *  within the triggering turn (the memory fold already happened via summon). */
async function continueAfterMemory(fx: WelcomeEffects, now: () => string): Promise<TurnReply> {
  const current = fx.progress.get();
  // Surface what we learned as a normal assistant text block (markdown), not a
  // bordered card inside the picker.
  const takeaway = current.introSummary;
  if (takeaway) await fx.say(copy.takeaway(takeaway));

  const basis = takeaway ?? current.introRawInput ?? "";
  const scouts = scoutSuggestionsFromBasis(basis);
  if (scouts.length > 0) {
    fx.progress.patch({ node: "await_scouts" });
    return scoutSuggestions(scouts);
  }
  return brainstormAppIdeas(fx, now);
}

async function brainstormAppIdeas(fx: WelcomeEffects, now: () => string): Promise<TurnReply> {
  const current = fx.progress.get();
  await fx.say(copy.ideasHandoffLead);

  // The brainstorm is autonomous and its real "approval" is the idea picker
  // below (the guardian picks one), so summon the specialist INLINE rather
  // than handing off — no child session, no submit-result gate.
  const basis = current.introSummary ?? current.introRawInput ?? "";
  const summoned = await fx.summon(IDEAS_AGENT, ideasBrief(basis));
  let ideas = summoned.ok ? ideasFromSummon(summoned.output) : [];
  const usedFallback = ideas.length === 0;
  if (usedFallback) ideas = GENERIC_IDEAS;

  fx.progress.patch({
    node: "await_idea",
    appIdeas: encodeIdeas(ideas),
    appIdeasGeneratedAt: now(),
  });
  if (usedFallback) await fx.say(copy.ideasFailed);
  return ideaPicker(ideas);
}

/** Resolve which idea the guardian chose from the idea-picker's output (or, as a
 *  fallback, typed text). Returns undefined for the explore opt-out / no match. */
function resolveChosenIdea(userText: string, ideas: AppIdea[]): AppIdea | undefined {
  if (isDismissedInteraction(userText)) return undefined;

  const chosen = field(userText, "ideaTitle");
  if (chosen) {
    if (chosen === EXPLORE) return undefined;
    return ideas.find((idea) => idea.title === chosen);
  }

  // Typed fallback: accept a number or a title mention.
  if (isNone(userText)) return undefined;
  const pick = parsePick(userText, ideas.length);
  if (pick !== null) return ideas[pick];
  const lower = normalize(userText);
  return ideas.find((idea) => lower.includes(idea.title.toLowerCase()));
}

function normalize(text: string): string {
  return text.trim().toLowerCase();
}

function isNone(text: string): boolean {
  return /^(none|no|nope|skip|later|not now)\b/.test(normalize(text));
}

/** A typed request to run onboarding again (fallback for the revisit button). */
function isRestart(text: string): boolean {
  return /\b(start over|restart|revisit|do (it|this) again|run again)\b/.test(normalize(text));
}

/** Parse a 1-based idea choice into a 0-based index, or null. */
function parsePick(text: string, count: number): number | null {
  const match = normalize(text).match(/\b(\d{1,2})\b/);
  if (!match) return null;
  const n = Number(match[1]);
  if (!Number.isInteger(n) || n < 1 || n > count) return null;
  return n - 1;
}

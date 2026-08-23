// User-facing strings for the scripted conversation, kept apart from the
// state-machine logic. Most interactive UI now lives in the app's
// own inline components (src/web/*.tsx); what's left here is conversational
// narration (text blocks) and the structured props for the completion card.

import type { AppIdea } from "../../db/repositories/progress.js";

/** Props for the `completion-card` inline component. */
export interface CompletionProps {
  heading: string;
  body?: string;
  kickoffPrompt?: string;
}

export const copy = {
  // --- Email handshake (the first onboarding step) ---
  // Lead-in above the email-handshake card. The card itself shows the two
  // addresses, so the text just sets up why.
  emailIntro: (agentName: string) =>
    [
      `👋 Hi — I'm ${agentName}.`,
      "",
      "First things first: let's make sure we can reach each other by email. Here's my address and the one I have for you — give it a look, and I'll send you a quick hello.",
    ].join("\n"),
  // Lead-in above the email-receipt card, shown right after the hello is sent.
  emailSentLead: "📬 Sent! It should land in a few seconds.",
  // The hello email itself, sent by the script (no agent) via send_message.
  // The body is Markdown — send_message renders it to HTML when no `html` is
  // given, and a Markdown email theme will dress it up later.
  helloEmailSubject: "Hello from Rome 👋",
  helloEmailBody: (agentName: string) =>
    [
      "# Hello 👋",
      "",
      `I'm **${agentName}** — your new AI, here to help with whatever you need.`,
      "",
      "This is just a quick hello so we know email works between us. From here you can:",
      "",
      "- **Reply to this email** any time — I'll read it and get back to you.",
      "- Forward me anything you'd like me to handle.",
      "- Ask me to keep an eye on something and report back.",
      "",
      "Talk soon,",
      "",
      `**${agentName}**`,
    ].join("\n"),

  // Greeting, emitted as a text block above the intro-choice card (shown after
  // the email handshake).
  greet: [
    "Now, let me get to know you a little.",
    "",
    "Two easy ways — pick whichever you like:",
  ].join("\n"),

  // --- Narration during the ChatGPT scrape (emitted as text while it runs) ---
  magicTrick:
    "✨ Watch the browser — I'll ask ChatGPT what it remembers about you and bring the highlights back. One moment…",
  chatgptNoMemory:
    "ChatGPT didn't have anything stored about you yet — no problem, let's just do the quick version.",
  chatgptFailed: "I couldn't read that from ChatGPT just now — let's do the quick version instead.",

  // --- Lead-ins ---
  // Above the fixed getting-to-know-you questionnaire card.
  questionsLead: "Great — a few quick questions (tap or type, whatever's easier):",
  // Narrated (text block) right before the inline `welcome-memory` summon runs,
  // on both the ChatGPT-import and the questionnaire branch.
  savingMemoryLead: "Thanks — folding that into your memory now.",
  scoutsLead:
    "I can also set up a few scouting tasks for your briefing app, so Rome keeps an eye on useful things for you.",
  ideasHandoffLead: "Got it. Brainstorming a few first apps for you…",
  ideasFailed: "I couldn't tailor these to you, but here are a few solid starters.",

  /** The memory takeaway, emitted as a normal text block (markdown) before the
   *  idea picker — replaces the old bordered "What I took away" card. */
  takeaway: (summary: string): string => `**What I took away**\n\n${summary}`,

  // --- Completion card props ---
  pickedIdea: (idea: AppIdea): CompletionProps => ({
    heading: `Let's build "${idea.title}".`,
    body: "Here's a prompt to kick it off — copy it into a normal chat with Rome when you're ready. You're all set!",
    kickoffPrompt: idea.prompt,
  }),
  finishedNoPick: {
    heading: "You're all set.",
    body: "When you're ready to build something, just tell Rome what you have in mind. Welcome aboard.",
  } satisfies CompletionProps,
  alreadyDone: {
    heading: "You've already finished the welcome.",
    body: "You can start chatting with Rome normally — or run it again below.",
  } satisfies CompletionProps,
};

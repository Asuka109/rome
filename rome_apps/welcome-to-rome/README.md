# Welcome to Rome

Conversational first-run onboarding. The guardian chats with Rome in the
**standard Chat UI**, but the assistant's side of the conversation is **scripted**
— driven by a deterministic state machine instead of a model. No tokens are
spent on the conversation itself, and the assistant can never go off-script.

This is the first client of the **turn-middleware** seam. A turn
middleware registered by this app intercepts every turn whose
`agentName === "welcome-to-rome"` and produces the reply by emitting synthetic,
model-isomorphic events into the turn's event stream. The webchat SSE and
persistence pipeline is a pure downstream consumer of that stream, so a scripted
turn streams, persists, and renders exactly like a model turn — with zero
changes to the webchat route, storage, or the front-end Chat component.

## How it works

- `agents/welcome-to-rome.yaml` — a **code-backed agent**. The
  model declared here is never called; it exists only so the webchat send route
  accepts the agent name and acquires a real session/transcript. The middleware
  short-circuits before any model round.
- `hooks/turn-middleware/` — the middleware. `script.ts` is the state machine
  (one node per conversation step: greet → email handshake → collect intro →
  brainstorm → finish); `copy.ts` holds the user-facing strings so wording
  changes don't touch logic; `index.ts` wires them to `ctx.emit` and the
  progress repo. The email handshake is a script step (no model): the
  `email-handshake` card reads the agent address from the email connection's
  `inbox` grant (`GET /api/connections`) and the guardian address from the
  settings row (`GET /api/settings`), and provisions a mailbox if needed by
  running the email conferral setup (`POST
  /api/connections/email/grants/inbox/setup` + poll); on agree, the middleware
  sends a hello
  via the `send_message` action and shows the `email-receipt` card.
- `agents/welcome-memory.yaml` / `agents/welcome-app-ideas.yaml` — the
  **side-effect** agents (folding the guardian's self-description into memory,
  brainstorming first-app ideas). The conversation is scripted, but these heavy
  steps remain real agents the middleware `summon`s — "the conversation doesn't
  use the model" is not "no model anywhere".
- `db/` — the singleton progress table. `node` is the state-machine cursor;
  captured artifacts are cached so a reload or restart resumes mid-conversation.

## The landing screen

`src/web/App.tsx` is the **first screen a guardian sees in Rome**. The web SPA
lands a freshly-onboarded guardian on `/apps/welcome-to-rome` (see
`resolveAuthRouting` in `packages/web/src/lib/auth-routing.ts` and `OnboardPage`),
so this app's web bundle is the entry point into the product.

It is deliberately a moment of delight rather than a form: a confetti burst on
mount (`canvas-confetti`, lazily code-split, honouring `prefers-reduced-motion`),
a floating hero mark with staggered entrance animation (keyframes in
`styles.css`), and a single **Start chat** button.

Pressing it calls `startChat({ agentName: "welcome-to-rome", … })` from
`@rome-os/app-web-sdk`, which creates the session, posts the kickoff turn, and
soft-navigates to `/chat/<id>` — where the scripted conversation below takes over.
(The kickoff text is ignored by the `greet` node; the state machine greets on
first contact regardless.)

## Starting a conversation directly

The same thing the button does, by hand — create a webchat session bound to this
agent and open it in the Chat UI:

```http
POST /chat/sessions
{ "name": "Welcome to Rome", "agentName": "welcome-to-rome" }
```

Send any first message and the scripted conversation begins.

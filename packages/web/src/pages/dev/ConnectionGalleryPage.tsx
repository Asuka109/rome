/**
 * Dev-only gallery of every service's Connection detail dialog, for reviewing
 * the credential-slot card layout/copy across ALL services and auth states at
 * once. Renders each card the real `buildConnectionCards` presentation adapter
 * produces from mock `/api/connections` payloads, framed like
 * `ConnectionDetailDialog`, tiled per state section — so what you see is
 * exactly what the production dialog renders.
 *
 * Served at `/dev/connections`, gated on `import.meta.env.DEV` in App.tsx like
 * every page in `pages/dev/` — the route and this chunk are dropped from
 * production builds.
 *
 * The ceremonies are the REAL production components (fetches and all), so their
 * tiles stay read-only by construction rather than by prop-threading a gallery
 * mode through them:
 *
 * - every dialog tile renders inside an `inert` wrapper, so nothing inside can
 *   be clicked, focused, or typed into — no connect/disconnect handler can run;
 * - a mount-scoped fetch guard (`useGalleryFetchGuard`) rejects every
 *   `/api/channels/*`, `/api/integrations/*`, `/api/connections*`, and
 *   `/api/setups/*` request while the page is mounted. Blocking clicks alone is
 *   NOT enough: some cards fetch on mount (the generic setup runner re-attaches
 *   to a discovered live setup, and Discord/Feishu poll their guardian-link
 *   state).
 *
 * Together these guarantee the gallery can never read or mutate the
 * developer's active profile through the connection API, no matter what state
 * the fixtures put the ceremonies in.
 *
 * To cover a new service or state, extend the fixtures/`SCENARIOS` below.
 */

import { useEffect, useState } from "react";
import { ConnectionDetailBody } from "@/components/ConnectionDetail";
import { PairingRequestCard } from "@/components/pairing-requests";
import { SetupRenderer } from "@/components/setup/setup-renderer";
import { ConnectionBrandBadge } from "@/components/brand-icons/connection-badges";
import { StatusIndicator } from "@/lib/connection-status";
import {
  buildConnectionCards,
  type ConnectionCard,
  type ConnectionSlot,
} from "@/lib/connection-cards";
import type { ApiConnection, GrantDisplay, GrantState } from "@/lib/connections-api";
import type { ComposioCliStatus } from "@/lib/provider-types";
import type { PairingRequest } from "@/lib/pairing-api";
import type { SetupState } from "@/lib/setup-api";

const noop = () => {};

/** The API surface the connection ceremonies talk to — everything blocked here. */
const BLOCKED_API_PREFIXES = [
  "/api/channels",
  "/api/integrations",
  "/api/connections",
  "/api/setups",
];

function pathnameOf(input: RequestInfo | URL): string {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  try {
    return new URL(url, window.location.origin).pathname;
  } catch {
    return url;
  }
}

/**
 * While mounted, replace `window.fetch` with a wrapper that rejects any
 * connection-API request (see `BLOCKED_API_PREFIXES`) and passes everything
 * else through. This is what stops the ceremonies' mount-time polling — the
 * `inert` wrappers already stop click-driven calls. Restores the real fetch on
 * unmount.
 */
function useGalleryFetchGuard() {
  useEffect(() => {
    const realFetch = window.fetch;
    window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
      const path = pathnameOf(input);
      if (BLOCKED_API_PREFIXES.some((prefix) => path.startsWith(prefix))) {
        return Promise.reject(
          new Error(`Blocked by the /dev/connections gallery fetch guard: ${path}`),
        );
      }
      return realFetch(input, init);
    };
    return () => {
      window.fetch = realFetch;
    };
  }, []);
}

// ── /api/connections fixtures ─────────────────────────────────────────────────

let fixtureId = 0;

/** One mock ConnectionView row. Grants map name → state (+ optional display). */
function apiConnection(
  service: string,
  grants: Record<string, { state: GrantState; display?: Partial<GrantDisplay> }>,
  options: { connect?: ApiConnection["connect"]; placeholder?: boolean } = {},
): ApiConnection {
  const grantStates: Record<string, GrantState> = {};
  const display: Record<string, GrantDisplay | null> = {};
  for (const [name, grant] of Object.entries(grants)) {
    grantStates[name] = grant.state;
    display[name] = grant.display
      ? {
          displayName: grant.display.displayName ?? null,
          handle: grant.display.handle ?? null,
          email: grant.display.email ?? null,
          avatarUrl: grant.display.avatarUrl ?? null,
        }
      : null;
  }
  return {
    id: options.placeholder ? null : `fixture-${service}-${fixtureId++}`,
    service,
    label: service,
    grants: grantStates,
    display,
    // Capability statuses don't drive the card presentation (copy is
    // hand-written per service), so a neutral projection suffices.
    capabilities: {
      talk: { state: "unsupported" },
      act: { state: "unsupported" },
      watch: { state: "unsupported" },
    },
    connect: options.connect ?? null,
  };
}

const AVAILABLE_CONNECT = {
  url: "/api/oauth/github/start",
  available: true,
  unavailableReason: null,
};

function composioStatus(overrides: Partial<ComposioCliStatus> = {}): ComposioCliStatus {
  return {
    installed: true,
    loggedIn: false,
    loginPending: false,
    webUrl: null,
    orgId: null,
    testUserId: null,
    error: null,
    ...overrides,
  };
}

/** Every service offerable, nothing conferred — the fresh-install placeholders. */
const emptyConnections: ApiConnection[] = [
  apiConnection("telegram", { bot: { state: "unauthorized" } }, { placeholder: true }),
  apiConnection("telegram_user", { session: { state: "unauthorized" } }, { placeholder: true }),
  apiConnection("whatsapp", { session: { state: "unauthorized" } }, { placeholder: true }),
  apiConnection("wechat", { account: { state: "unauthorized" } }, { placeholder: true }),
  apiConnection("discord", { bot: { state: "unauthorized" } }, { placeholder: true }),
  apiConnection("email", { inbox: { state: "unauthorized" } }, { placeholder: true }),
  apiConnection("feishu", { app: { state: "unauthorized" } }, { placeholder: true }),
  apiConnection("webchat", {}, { placeholder: true }),
  apiConnection(
    "github",
    { user: { state: "unauthorized" } },
    {
      placeholder: true,
      connect: AVAILABLE_CONNECT,
    },
  ),
  apiConnection(
    "google",
    { user: { state: "unauthorized" } },
    {
      placeholder: true,
      connect: AVAILABLE_CONNECT,
    },
  ),
];

/** Every service conferred and healthy, with hydrated grant profiles. */
const connectedConnections: ApiConnection[] = [
  apiConnection("telegram", {
    bot: { state: "authorized", display: { handle: "rome_dev_bot" } },
  }),
  apiConnection("telegram_user", {
    session: {
      state: "authorized",
      display: { displayName: "Zhang Fan", handle: "zhangfan" },
    },
  }),
  apiConnection("whatsapp", { session: { state: "authorized" } }),
  apiConnection("wechat", {
    account: { state: "authorized", display: { handle: "wx_rome" } },
  }),
  apiConnection("discord", {
    bot: { state: "authorized", display: { handle: "rome-bot#1234" } },
  }),
  apiConnection("email", {
    inbox: {
      state: "authorized",
      display: { handle: "agent@rome.dev", email: "agent@rome.dev" },
    },
  }),
  apiConnection("feishu", {
    app: { state: "authorized", display: { handle: "cli_a1b2c3" } },
  }),
  apiConnection("webchat", {}),
  apiConnection(
    "github",
    {
      user: {
        state: "authorized",
        display: {
          displayName: "Zhang Fan",
          handle: "zhangfand",
          avatarUrl: "https://avatars.githubusercontent.com/u/1?v=4",
        },
      },
    },
    { connect: AVAILABLE_CONNECT },
  ),
  apiConnection(
    "google",
    {
      user: {
        state: "authorized",
        display: { displayName: "Zhang Fan", email: "dong.zhangfan@gmail.com" },
      },
    },
    { connect: AVAILABLE_CONNECT },
  ),
];

interface GalleryScenario {
  title: string;
  note?: string;
  connections: ApiConnection[];
  composio: ComposioCliStatus | null;
  /** Restrict the section to these services (default: everything). */
  only?: string[];
}

const SCENARIOS: GalleryScenario[] = [
  {
    title: "Not connected",
    note: "Fresh install: every registered service listed as an offerable placeholder (id: null).",
    connections: emptyConnections,
    composio: composioStatus(),
  },
  {
    title: "Connected",
    connections: connectedConnections,
    composio: composioStatus({ loggedIn: true }),
  },
  {
    title: "Degraded (needs attention)",
    note: "The ledger knows these grants are broken (degraded): the Telegram personal-account session was revoked upstream, GitHub renders as needs-reconnect (still connected). Google: provider unavailable on this host. Composio: login in flight. (Guardian-verification ceremony states — codes, polling — live in the pure-view section above; they are ceremony state, not grant state.)",
    connections: [
      apiConnection("telegram", {
        bot: { state: "authorized", display: { handle: "rome_dev_bot" } },
      }),
      apiConnection("telegram_user", {
        session: { state: "degraded", display: { displayName: "Zhang Fan" } },
      }),
      apiConnection(
        "github",
        {
          user: {
            state: "degraded",
            display: { displayName: "Zhang Fan", handle: "zhangfand" },
          },
        },
        { connect: AVAILABLE_CONNECT },
      ),
      apiConnection(
        "google",
        { user: { state: "unauthorized" } },
        {
          placeholder: true,
          connect: {
            url: null,
            available: false,
            unavailableReason: "Rome Cloud is not reachable from this host.",
          },
        },
      ),
    ],
    composio: composioStatus({ loginPending: true }),
    only: ["telegram", "github", "google", "composio"],
  },
];

export default function ConnectionGalleryPrototypePage() {
  useGalleryFetchGuard();
  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-7xl space-y-10">
        <header className="space-y-1">
          <h1 className="text-title text-foreground">
            Connection dialog gallery{" "}
            <span className="rounded-4 bg-warning-bg px-2 py-1 text-badge text-warning-fg">
              DEV ONLY
            </span>
          </h1>
          <p className="text-body text-muted-foreground">
            Every service&apos;s connection detail dialog, rendered from mock{" "}
            <code>/api/connections</code> payloads through the real{" "}
            <code>buildConnectionCards</code> presentation adapter. Every tile is <code>inert</code>{" "}
            and all connection API calls are blocked while this page is mounted, so nothing here can
            touch your profile.
          </p>
        </header>

        <CeremonyStates />

        {SCENARIOS.map((scenario) => (
          <GallerySection key={scenario.title} scenario={scenario} />
        ))}
      </div>
    </div>
  );
}

const SETUP_FIXTURES: Array<{ service: string; state: SetupState }> = [
  {
    service: "telegram",
    state: {
      status: "awaiting-input",
      form: {
        instructions: "Create a Telegram bot, then paste its token.",
        steps: [{ text: "Open @BotFather", done: true }, { text: "Paste the bot token" }],
        fields: [{ name: "token", label: "Telegram bot token", secret: true }],
      },
    },
  },
  {
    service: "discord",
    state: {
      status: "awaiting-redirect",
      url: "https://discord.com/developers/applications",
    },
  },
  {
    service: "feishu",
    state: {
      status: "presenting",
      view: {
        title: "Scan to create the agent app",
        body: ["Scan this QR code in Feishu or Lark."],
        qr: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Crect width='120' height='120' fill='white'/%3E%3Cpath d='M10 10h40v40H10zm60 0h40v40H70zM10 70h40v40H10zm60 10h10v10H70zm20-10h20v40H90z' fill='black'/%3E%3C/svg%3E",
        progress: true,
      },
    },
  },
  {
    service: "whatsapp",
    state: {
      status: "presenting",
      view: {
        title: "Enter this code on your phone",
        code: {
          label: "WhatsApp pairing code",
          value: "ABCD1234",
          destination: "Enter this exact code in WhatsApp on your phone.",
          copyLabel: "Copy code",
          copiedLabel: "WhatsApp pairing code copied",
        },
        body: ["The code expires when this setup is cancelled."],
        steps: [
          { text: "Open Linked Devices", done: true },
          { text: "Choose Link with phone number instead" },
        ],
        progress: true,
      },
    },
  },
];

function fixturePairing(id: string, displayName: string): PairingRequest {
  return {
    id,
    channel: "telegram",
    channelUserId: `user-${id}`,
    displayName,
    status: "pending",
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 900_000).toISOString(),
    pairingUrl: `https://rome.example/pairing/${id}#token=fixture`,
    cli: {
      approve: `curl -fsS -X POST http://127.0.0.1:4141/_internal/pairings/${id}/approve`,
      reject: `curl -fsS -X POST http://127.0.0.1:4141/_internal/pairings/${id}/reject`,
    },
  };
}

function CeremonyStates() {
  const [setupResult, setSetupResult] = useState("No setup action yet.");
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-section text-foreground">Setup and account-pairing states</h2>
        <p className="text-body text-muted-foreground">
          Interactive fixtures: copy, cancel, approve, and reject stay local to this page.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {SETUP_FIXTURES.map(({ service, state }) => (
          <div key={service} className="rounded-12 border border-border bg-surface p-4">
            <p className="mb-3 font-mono text-aux text-muted-foreground">{service}</p>
            <SetupRenderer
              service={service}
              state={state}
              busy={false}
              error={null}
              onSubmit={() => setSetupResult(`${service}: submitted`)}
              onCancel={() => setSetupResult(`${service}: cancelled`)}
              onRetry={() => setSetupResult(`${service}: retried`)}
            />
          </div>
        ))}
      </div>
      <p role="status" className="text-aux text-muted-foreground">
        {setupResult}
      </p>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <PairingRequestCard
          request={fixturePairing("approve", "Pending approval")}
          onDecision={async () => {}}
        />
        <PairingRequestCard
          request={fixturePairing("reject", "Pending rejection")}
          onDecision={async () => {}}
        />
        <PairingRequestCard
          request={fixturePairing("expired", "Expired request")}
          onDecision={async () => {
            throw new Error("This pairing request expired.");
          }}
        />
        <PairingRequestCard
          request={fixturePairing("replay", "Already resolved request")}
          onDecision={async () => {
            throw new Error("This pairing request was already resolved.");
          }}
        />
      </div>
    </section>
  );
}

function GallerySection({ scenario }: { scenario: GalleryScenario }) {
  // Telegram renders here too (bot + personal-account slots in one dialog) so
  // the list-derived states show alongside every other service; the pure-view
  // section above also covers the bot ceremony's interaction states no
  // list snapshot can express.
  const cards = buildConnectionCards(scenario.connections, scenario.composio).filter(
    (card) => !scenario.only || scenario.only.includes(card.service),
  );

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-section text-foreground">{scenario.title}</h2>
        {scenario.note && <p className="text-body text-muted-foreground">{scenario.note}</p>}
      </div>
      {/* `inert` makes every ceremony inside unclickable/unfocusable — the
          interaction half of the read-only guarantee (the fetch guard covers
          mount-time effects). */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2" inert>
        {cards.map((card) => (
          <DialogFrame key={card.service} card={card} scenario={scenario} />
        ))}
      </div>
    </section>
  );
}

/**
 * A static replica of `ConnectionDetailDialog`'s chrome (Dialog size="lg" +
 * DialogHeader + DialogBody class stacks) so many dialogs can tile on one page
 * instead of portaling a modal.
 */
function DialogFrame({ card, scenario }: { card: ConnectionCard; scenario: GalleryScenario }) {
  return (
    <div className="space-y-2">
      <p className="font-mono text-aux text-muted-foreground">{card.service}</p>
      <div className="w-full max-w-2xl rounded-16 border border-border bg-surface text-foreground shadow-25 ring-1 ring-black/5">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <ConnectionBrandBadge connection={card.service} />
            <div className="min-w-0 flex-1">
              <p className="text-body">{card.label}</p>
              <StatusIndicator card={card} className="mt-1" />
            </div>
          </div>
        </div>
        <div className="px-6 py-4">
          <ConnectionDetailBody
            card={card}
            composio={scenario.composio}
            onRefresh={noop}
            onFlash={noop}
          />
        </div>
      </div>
    </div>
  );
}

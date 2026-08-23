// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { TFunction } from "i18next";
import i18n from "@/i18n";
import PeoplePage, { describeFreshness } from "./PeoplePage";

// The create-profile / link forms now run on TanStack Form + Zod. The behavior
// under test is the observable contract: a valid form POSTs the expected
// payload, and an empty required field can't be submitted — independent of the
// form internals.

beforeAll(async () => {
  await i18n.changeLanguage("en");
  // Radix Select drives pointer capture and scroll, neither of which jsdom
  // implements.
  Element.prototype.hasPointerCapture = () => false;
  Element.prototype.setPointerCapture = () => {};
  Element.prototype.releasePointerCapture = () => {};
  Element.prototype.scrollIntoView = () => {};
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

interface FetchCall {
  url: string;
  method: string;
  body: unknown;
  /** Set when the caller aborted this request before it could settle. */
  aborted?: boolean;
}

type RouteResult = {
  ok: boolean;
  json?: unknown;
  /** Overrides the default 200/400 status, so a route can answer 500. */
  status?: number;
  /** Rejects the fetch, standing in for a network failure. */
  throws?: boolean;
  /** Never settles, standing in for a load still in flight. */
  pending?: boolean;
  /** Delays the response, so overlapping requests can be ordered. */
  delayMs?: number;
};

function mockFetch(route: (url: string, method: string) => RouteResult): FetchCall[] {
  const calls: FetchCall[] = [];
  vi.spyOn(globalThis, "fetch").mockImplementation((async (
    input: RequestInfo | URL,
    init?: RequestInit,
  ) => {
    const url = String(input);
    const method = (init?.method ?? "GET").toUpperCase();
    const body = typeof init?.body === "string" ? JSON.parse(init.body) : undefined;
    const call: FetchCall = { url, method, body };
    calls.push(call);
    const res = route(url, method);
    if (res.throws) throw new TypeError("Failed to fetch");
    if (res.pending) return new Promise<Response>(() => {});
    // A delayed response honours `signal`, like the real thing: the query layer
    // cancels a superseded request, and a mock that ignored the abort would let
    // it complete and hide exactly the races these tests exist to catch.
    if (res.delayMs) {
      await new Promise<void>((resolve, reject) => {
        const abort = () => {
          clearTimeout(timer);
          call.aborted = true;
          reject(new DOMException("The operation was aborted.", "AbortError"));
        };
        const timer = setTimeout(() => {
          init?.signal?.removeEventListener("abort", abort);
          resolve();
        }, res.delayMs);
        if (init?.signal?.aborted) return abort();
        init?.signal?.addEventListener("abort", abort);
      });
    }
    return {
      ok: res.ok,
      status: res.status ?? (res.ok ? 200 : 400),
      json: async () => res.json ?? {},
      text: async () => "",
    } as Response;
  }) as typeof fetch);
  return calls;
}

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <PeoplePage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const unknownSender = {
  channel: "telegram",
  channelUserId: "123",
  displayName: "Alice",
  lastMessage: null,
  lastMessageAt: null,
};

const knownPerson = {
  id: "person_dana",
  displayName: "Dana",
  bondLevel: "acquaintance",
  channelMappings: [{ channel: "telegram", channelUserId: "999" }],
};

function peopleRoutes(url: string): RouteResult {
  if (url.includes("/api/persons/unknown")) return { ok: true, json: [unknownSender] };
  if (url.includes("/api/persons/create")) return { ok: true, json: {} };
  if (url.includes("/api/persons")) return { ok: true, json: [knownPerson] };
  return { ok: true, json: [] };
}

/** The label on both the card's trigger and the confirmation's accept button. */
const STRANGER_LABEL = "Treat as stranger";

/**
 * Marking a sender a stranger is irreversible, so it sits behind a
 * confirmation: the write only starts once the dialog's accept is pressed.
 */
async function confirmMarkStranger(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: STRANGER_LABEL }));
  const dialog = await screen.findByRole("dialog");
  await user.click(within(dialog).getByRole("button", { name: STRANGER_LABEL }));
}

describe("PeoplePage create-profile form", () => {
  it("posts the new profile for an unknown sender", async () => {
    const calls = mockFetch(peopleRoutes);
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText("Alice")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Create" }));
    await user.click(screen.getByRole("button", { name: "Create profile" }));

    await waitFor(() =>
      expect(calls.some((c) => c.url.includes("/api/persons/create") && c.method === "POST")).toBe(
        true,
      ),
    );
    const post = calls.find((c) => c.url.includes("/api/persons/create") && c.method === "POST");
    expect(post?.body).toMatchObject({
      displayName: "Alice",
      bondLevel: "acquaintance",
      relation: "",
      channel: "telegram",
      channelUserId: "123",
    });
  });

  it("disables submit when the name is cleared", async () => {
    mockFetch(peopleRoutes);
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText("Alice")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Create" }));
    await user.clear(screen.getByDisplayValue("Alice"));

    const submit = screen.getByRole("button", { name: "Create profile" }) as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
  });

  it("keeps Cancel on the inline form, where there is input to abandon", async () => {
    mockFetch(peopleRoutes);
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText("Alice")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Create" }));

    expect(screen.getByRole("button", { name: "Cancel" })).toBeTruthy();
  });
});

// A request in flight must keep saying which operation is running: a button
// whose accessible name collapses to "…" announces nothing at the moment the
// user is waiting for confirmation. The resting label stays in the box so the
// swap doesn't resize the button, but only the active one is exposed.
describe("PeoplePage in-flight labels", () => {
  function heldFetch(held: string): () => void {
    let release: (() => void) | undefined;
    vi.spyOn(globalThis, "fetch").mockImplementation((async (
      input: RequestInfo | URL,
      init?: RequestInit,
    ) => {
      const url = String(input);
      const method = (init?.method ?? "GET").toUpperCase();
      if (method === "POST" && url.includes(held)) {
        await new Promise<void>((resolve) => {
          release = resolve;
        });
      }
      const res = peopleRoutes(url);
      return {
        ok: res.ok,
        status: 200,
        json: async () => res.json ?? {},
      } as Response;
    }) as typeof fetch);
    return () => release?.();
  }

  it("names the running operation while creating a profile", async () => {
    const release = heldFetch("/api/persons/create");
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText("Alice")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Create" }));
    await user.click(screen.getByRole("button", { name: "Create profile" }));

    const busy = await screen.findByRole("button", { name: "Creating…" });
    // The resting label stays rendered to hold the button's width, but is not
    // part of its accessible name.
    expect(busy.textContent).toContain("Create profile");
    expect(screen.queryByRole("button", { name: "…" })).toBeNull();
    await act(async () => release());
  });

  it("names the running operation while linking to an existing person", async () => {
    const release = heldFetch("/api/persons/link");
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText("Alice")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Link" }));
    await user.click(screen.getByRole("combobox"));
    await user.click(screen.getByRole("option", { name: /Dana/ }));
    await user.click(screen.getByRole("button", { name: "Link" }));

    const busy = await screen.findByRole("button", { name: "Linking…" });
    expect(busy.textContent).toContain("Link");
    expect(screen.queryByRole("button", { name: "…" })).toBeNull();
    await act(async () => release());
  });

  it("names the running operation while marking a sender a stranger", async () => {
    const release = heldFetch("/api/persons/mark-stranger");
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText("Alice")).toBeTruthy();
    // The card's trigger, not the dialog, carries the in-flight label, so the
    // confirmation closes as soon as the write starts.
    await confirmMarkStranger(user);

    const busy = await screen.findByRole("button", { name: "Marking…" });
    expect(busy.textContent).toContain(STRANGER_LABEL);
    expect(screen.queryByRole("button", { name: "…" })).toBeNull();
    await act(async () => release());
  });
});

// A failed mutation has to say so: the card keeps the form open and puts the
// reason next to the submit row, so the only user model isn't "my click didn't
// register" (which invites a blind retry).
describe("PeoplePage mutation failures", () => {
  const carol = {
    id: "carol",
    displayName: "Carol",
    bondLevel: "acquaintance",
    channelMappings: [],
  };

  // Exactly one card is on screen per test, so "Create"/"Link" stay unambiguous.
  function routes(
    over: (url: string, method: string) => RouteResult | null,
    card: "sender" | "whatsapp" = "sender",
  ) {
    return (url: string, method: string): RouteResult => {
      const hit = over(url, method);
      if (hit) return hit;
      if (url.includes("/api/persons/unknown"))
        return { ok: true, json: card === "sender" ? [unknownSender] : [] };
      if (url.includes("/api/whatsapp/contacts"))
        return { ok: true, json: card === "whatsapp" ? [waContact] : [] };
      if (url.includes("/api/persons")) return { ok: true, json: [carol] };
      return { ok: true, json: [] };
    };
  }

  it("shows the server's own message when create answers 400", async () => {
    mockFetch(
      routes((url) =>
        url.includes("/api/persons/create")
          ? { ok: false, status: 400, json: { error: "displayName is required" } }
          : null,
      ),
    );
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText("Alice")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Create" }));
    await user.click(screen.getByRole("button", { name: "Create profile" }));

    expect(await screen.findByText("displayName is required")).toBeTruthy();
    // The form stays open so the guardian can fix and resubmit.
    expect(screen.getByRole("button", { name: "Create profile" })).toBeTruthy();
  });

  it("falls back to generic copy when create answers 500 with no body", async () => {
    mockFetch(
      routes((url) => (url.includes("/api/persons/create") ? { ok: false, status: 500 } : null)),
    );
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText("Alice")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Create" }));
    await user.click(screen.getByRole("button", { name: "Create profile" }));

    expect(await screen.findByText("Something went wrong. The change wasn't saved.")).toBeTruthy();
  });

  it("keeps a 500's exception text out of the card", async () => {
    // The API error handler serializes an unhandled exception as a 500
    // `{ error: err.message }` (packages/core/src/api/middleware/error-handler.ts),
    // so a 5xx body is a diagnostic, never copy to put in front of a guardian.
    mockFetch(
      routes((url) =>
        url.includes("/api/persons/create")
          ? {
              ok: false,
              status: 500,
              json: { error: "SQLITE_CONSTRAINT: UNIQUE constraint failed: person_mappings.id" },
            }
          : null,
      ),
    );
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText("Alice")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Create" }));
    await user.click(screen.getByRole("button", { name: "Create profile" }));

    expect(await screen.findByText("Something went wrong. The change wasn't saved.")).toBeTruthy();
    expect(screen.queryByText(/SQLITE_CONSTRAINT/)).toBeNull();
  });

  it("catches a network failure rather than rejecting unhandled", async () => {
    mockFetch(
      routes((url) => (url.includes("/api/persons/create") ? { ok: false, throws: true } : null)),
    );
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText("Alice")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Create" }));
    await user.click(screen.getByRole("button", { name: "Create profile" }));

    expect(
      await screen.findByText("Couldn't reach the server. Check your connection and try again."),
    ).toBeTruthy();
  });

  it("surfaces a failed link on an unmapped sender", async () => {
    mockFetch(
      routes((url) =>
        url.includes("/api/persons/link")
          ? { ok: false, status: 400, json: { error: "existingPersonId is required" } }
          : null,
      ),
    );
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText("Alice")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Link" }));
    await user.click(screen.getByRole("combobox"));
    await user.click(await screen.findByRole("option", { name: /Carol/ }));
    await user.click(screen.getByRole("button", { name: "Link" }));

    expect(await screen.findByText("existingPersonId is required")).toBeTruthy();
  });

  it("surfaces a failed mark-stranger", async () => {
    mockFetch(
      routes((url) =>
        url.includes("/api/persons/mark-stranger")
          ? { ok: false, status: 400, json: { error: "channel is required" } }
          : null,
      ),
    );
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText("Alice")).toBeTruthy();
    await confirmMarkStranger(user);

    expect(await screen.findByText("channel is required")).toBeTruthy();
  });

  it("locks the card's other actions while mark-stranger is in flight", async () => {
    // The card holds one error, so a mark-stranger failure that lands after a
    // form has been opened would render beside that unrelated form's submit
    // row. Nothing else on the card may start while this one is running.
    let release: (() => void) | undefined;
    const fallback = routes(() => null);
    vi.spyOn(globalThis, "fetch").mockImplementation((async (
      input: RequestInfo | URL,
      init?: RequestInit,
    ) => {
      const url = String(input);
      const method = (init?.method ?? "GET").toUpperCase();
      if (method === "POST" && url.includes("/api/persons/mark-stranger")) {
        await new Promise<void>((resolve) => {
          release = resolve;
        });
        return {
          ok: false,
          status: 400,
          json: async () => ({ error: "channel is required" }),
        } as Response;
      }
      const res = fallback(url, method);
      return {
        ok: res.ok,
        status: res.status ?? 200,
        json: async () => res.json ?? {},
      } as Response;
    }) as typeof fetch);

    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText("Alice")).toBeTruthy();
    await confirmMarkStranger(user);

    await waitFor(() =>
      expect((screen.getByRole("button", { name: "Create" }) as HTMLButtonElement).disabled).toBe(
        true,
      ),
    );
    expect((screen.getByRole("button", { name: "Link" }) as HTMLButtonElement).disabled).toBe(true);

    // Once it settles the failure lands on the row that owns it, with no form open.
    await act(async () => release?.());
    expect(await screen.findByText("channel is required")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Create profile" })).toBeNull();
  });

  it("surfaces a failed create on a WhatsApp contact card", async () => {
    mockFetch(
      routes(
        (url) =>
          url.includes("/api/persons/create")
            ? { ok: false, status: 400, json: { error: "channelUserId is required" } }
            : null,
        "whatsapp",
      ),
    );
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText("Bob")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Create" }));
    await user.click(screen.getByRole("button", { name: "Create profile" }));

    expect(await screen.findByText("channelUserId is required")).toBeTruthy();
  });

  it("clears a stale error and closes the form once the retry succeeds", async () => {
    let fail = true;
    mockFetch(
      routes((url) =>
        url.includes("/api/persons/create")
          ? fail
            ? { ok: false, status: 400, json: { error: "displayName is required" } }
            : { ok: true, json: { success: true } }
          : null,
      ),
    );
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText("Alice")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Create" }));
    await user.click(screen.getByRole("button", { name: "Create profile" }));
    expect(await screen.findByText("displayName is required")).toBeTruthy();

    fail = false;
    await user.click(screen.getByRole("button", { name: "Create profile" }));

    await waitFor(() =>
      expect(screen.queryByRole("button", { name: "Create profile" })).toBeNull(),
    );
    expect(screen.queryByText("displayName is required")).toBeNull();
  });
});

// The mapping this writes is permanent — there is no unmap endpoint — so the
// write has to be confirmed, and the confirmation has to say what it costs.
describe("PeoplePage mark-as-stranger confirmation", () => {
  const trigger = { name: STRANGER_LABEL };

  it("opens a confirmation naming the sender and the consequence instead of writing", async () => {
    const calls = mockFetch(peopleRoutes);
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText("Alice")).toBeTruthy();
    await user.click(screen.getByRole("button", trigger));

    const dialog = await screen.findByRole("dialog");
    expect(dialog.textContent).toContain("Alice");
    // Both consequences: the agent treats them as a stranger, and they leave
    // the list they were in. It names that section rather than the page —
    // the mapping only removes them from the unmapped list, and a WhatsApp
    // sender who is also a synced contact keeps their card further down.
    expect(dialog.textContent).toMatch(/stranger/i);
    expect(dialog.textContent).toMatch(/no longer appear under Unmapped senders/i);
    expect(calls.some((c) => c.url.includes("/api/persons/mark-stranger"))).toBe(false);
  });

  it("puts focus on the least-destructive control when the confirmation opens", async () => {
    mockFetch(peopleRoutes);
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText("Alice")).toBeTruthy();
    await user.click(screen.getByRole("button", trigger));

    const dialog = await screen.findByRole("dialog");
    const cancel = within(dialog).getByRole("button", { name: "Cancel" });
    await waitFor(() => expect(document.activeElement).toBe(cancel));
  });

  it("issues no request and keeps the sender when the confirmation is cancelled", async () => {
    const calls = mockFetch(peopleRoutes);
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText("Alice")).toBeTruthy();
    await user.click(screen.getByRole("button", trigger));

    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Cancel" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(calls.some((c) => c.url.includes("/api/persons/mark-stranger"))).toBe(false);
    expect(screen.getByRole("button", trigger)).toBeTruthy();
  });

  it("posts the mapping only after the confirmation is accepted", async () => {
    const calls = mockFetch(peopleRoutes);
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText("Alice")).toBeTruthy();
    await confirmMarkStranger(user);

    await waitFor(() =>
      expect(
        calls.some((c) => c.url.includes("/api/persons/mark-stranger") && c.method === "POST"),
      ).toBe(true),
    );
    const post = calls.find((c) => c.url.includes("/api/persons/mark-stranger"));
    expect(post?.body).toMatchObject({
      channel: "telegram",
      channelUserId: "123",
      displayName: "Alice",
    });
  });
});

const waContact = {
  jid: "5551234@s.whatsapp.net",
  phoneNumber: "5551234",
  name: "Bob",
  notify: null,
  verifiedName: null,
  imgUrl: null,
  linkedPersonId: null,
  linkedPersonName: null,
  lastMessageAt: null,
  lastMessagePreview: null,
  messageCount: 0,
};

const waPerson = {
  id: "person_carol",
  displayName: "Carol",
  bondLevel: "acquaintance",
  channelMappings: [{ channel: "whatsapp", channelUserId: "5559999@s.whatsapp.net" }],
};

function waRoutes(url: string): RouteResult {
  if (url.includes("/api/persons/unknown")) return { ok: true, json: [] };
  if (url.includes("/messages")) return { ok: true, json: [] };
  if (url.includes("/send")) return { ok: true, json: { ok: true } };
  if (url.includes("/api/whatsapp/contacts")) return { ok: true, json: [waContact] };
  if (url.includes("/api/persons")) return { ok: true, json: [] };
  return { ok: true, json: [] };
}

describe("PeoplePage WhatsApp composer", () => {
  it("sends a WhatsApp message to a contact from the chat dialog", async () => {
    const calls = mockFetch(waRoutes);
    const user = userEvent.setup();
    renderPage();

    // Open the chat for the synced WhatsApp contact.
    expect(await screen.findByText("Bob")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Messages" }));

    // Compose and send.
    const composer = await screen.findByPlaceholderText("Type a message");
    await user.type(composer, "Hi there");
    await user.click(screen.getByRole("button", { name: "Send" }));

    await waitFor(() =>
      expect(
        calls.some(
          (c) =>
            c.method === "POST" &&
            c.url.includes("/api/whatsapp/contacts/") &&
            c.url.includes("/send"),
        ),
      ).toBe(true),
    );
    const post = calls.find((c) => c.method === "POST" && c.url.includes("/send"));
    expect(post?.body).toMatchObject({ text: "Hi there" });
    // The sent text renders optimistically in the thread.
    expect(screen.getByText("Hi there")).toBeTruthy();
  });

  it("names the thread the same on the contact card and the person's channel pill", async () => {
    // Both controls open the same MessagesDialog, so they must not read as two
    // different operations ("Message" promising composition, "View messages"
    // promising reading) — nor differ from the dialog they open.
    mockFetch((url) => {
      if (url.includes("/api/persons/unknown")) return { ok: true, json: [] };
      if (url.includes("/messages")) return { ok: true, json: [] };
      if (url.includes("/api/whatsapp/contacts")) return { ok: true, json: [waContact] };
      if (url.includes("/api/persons")) return { ok: true, json: [waPerson] };
      return { ok: true, json: [] };
    });
    renderPage();

    expect(await screen.findByText("Bob")).toBeTruthy();
    expect(await screen.findByText("Carol")).toBeTruthy();
    // The WhatsApp contact card button and the person card's channel pill.
    expect(screen.getAllByRole("button", { name: "Messages" })).toHaveLength(2);
    expect(screen.queryByRole("button", { name: "Message" })).toBeNull();
    expect(screen.queryByRole("button", { name: "View messages" })).toBeNull();
  });

  it("labels the chat dialog's close control as closing, not cancelling", async () => {
    mockFetch(waRoutes);
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText("Bob")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Messages" }));

    // Nothing is being abandoned — the control dismisses a viewer.
    expect(await screen.findByRole("button", { name: "Close" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Cancel" })).toBeNull();
  });

  it("renders a reaction as an emoji on its target message, not an empty bubble", async () => {
    const user = userEvent.setup();
    mockFetch((url) => {
      if (url.includes("/messages")) {
        return {
          ok: true,
          json: [
            {
              id: "m1",
              senderJid: null,
              fromMe: true,
              timestamp: 1_700_000_000,
              type: "text",
              text: "video是我发的好不好",
              hasMedia: false,
              pushName: null,
              reactsToId: null,
            },
            {
              id: "r1",
              senderJid: "5551234@s.whatsapp.net",
              fromMe: false,
              timestamp: 1_700_000_050,
              type: "reaction",
              text: "❤️",
              hasMedia: false,
              pushName: "Bob",
              reactsToId: "m1",
            },
          ],
        };
      }
      return waRoutes(url);
    });
    renderPage();

    expect(await screen.findByText("Bob")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Messages" }));

    // The reaction surfaces as its emoji, pinned to the reacted-to message.
    expect(await screen.findByText("video是我发的好不好")).toBeTruthy();
    expect(screen.getByText("❤️")).toBeTruthy();
    // It is not rendered as a standalone "reacted to an earlier message" note,
    // because its target is in view.
    expect(screen.queryByText(/reacted/i)).toBeNull();
  });
});

// The header's freshness line: it may only claim what actually loaded, and the
// timestamp it quotes is always the last fetch where every source answered.
describe("describeFreshness", () => {
  const t = i18n.getFixedT("en", "people") as TFunction<"people">;
  // Read per assertion, not once for the describe: a timestamp captured at
  // collection time drifts past "just now" while the rest of the suite runs.
  const now = () => Date.now();

  it("is live only when nothing failed and a full load has landed", () => {
    expect(describeFreshness(t, { failed: 0, total: 3, lastFetchedAt: now() })).toEqual({
      label: "Live · updated just now",
      live: true,
    });
    expect(describeFreshness(t, { failed: 0, total: 3, lastFetchedAt: null })).toEqual({
      label: "Loading…",
      live: false,
    });
  });

  it("reports a total outage only when every source failed", () => {
    expect(describeFreshness(t, { failed: 3, total: 3, lastFetchedAt: null })).toEqual({
      label: "Couldn't reach the server",
      live: false,
    });
    expect(describeFreshness(t, { failed: 3, total: 3, lastFetchedAt: now() })).toEqual({
      label: "Couldn't refresh · last updated just now",
      live: false,
    });
  });

  it("distinguishes a partial failure from a total one", () => {
    expect(describeFreshness(t, { failed: 1, total: 3, lastFetchedAt: null })).toEqual({
      label: "Some sections couldn't load",
      live: false,
    });
    expect(describeFreshness(t, { failed: 1, total: 3, lastFetchedAt: now() })).toEqual({
      label: "Some sections couldn't refresh · last updated just now",
      live: false,
    });
  });
});

// A load that fails must never be rendered as emptiness: the guardian is told
// the request failed and offered a retry, instead of "there is nothing here".
describe("PeoplePage load failures", () => {
  const okEmpty: RouteResult = { ok: true, json: [] };

  it("renders an error with a retry instead of the known-persons empty state", async () => {
    let personsFail = true;
    const user = userEvent.setup();
    mockFetch((url) => {
      if (url.includes("/api/persons/unknown")) return okEmpty;
      if (url.includes("/api/persons")) {
        return personsFail
          ? { ok: false, status: 503, json: { error: "Person store is offline" } }
          : {
              ok: true,
              json: [
                { id: "p1", displayName: "Carol", bondLevel: "acquaintance", channelMappings: [] },
              ],
            };
      }
      return okEmpty;
    });
    renderPage();

    expect(await screen.findByText("Couldn't load")).toBeTruthy();
    expect(screen.queryByText("No known persons yet")).toBeNull();

    // Retrying restores the list in place, without a page reload.
    personsFail = false;
    await user.click(screen.getAllByRole("button", { name: "Try again" })[0]);
    expect(await screen.findByText("Carol")).toBeTruthy();
    expect(screen.queryByText("Couldn't load")).toBeNull();
  });

  it("keeps a 5xx's exception text out of the error panel", async () => {
    // Same rule the mutation path follows: the API error handler serializes an
    // unhandled exception as `{ error: err.message }`, so a 5xx body is a
    // diagnostic and never copy — while a 4xx body does explain the request.
    mockFetch((url) => {
      if (url.includes("/api/persons/unknown")) return okEmpty;
      if (url.includes("/api/persons")) {
        return {
          ok: false,
          status: 500,
          json: { error: "SQLITE_ERROR: no such table: persons" },
        };
      }
      return okEmpty;
    });
    renderPage();

    expect(
      await screen.findByText("Something went wrong. Check your connection and try again."),
    ).toBeTruthy();
    expect(screen.queryByText(/SQLITE_ERROR/)).toBeNull();
  });

  it("renders an error rather than empty states when the network is offline", async () => {
    mockFetch(() => ({ ok: false, throws: true }));
    renderPage();

    expect(
      (await screen.findAllByText(/Check your connection and try again/i)).length,
    ).toBeGreaterThan(0);
    expect(screen.queryByText("No known persons yet")).toBeNull();
    expect(screen.queryByText("No unmapped senders")).toBeNull();
  });

  it("stops claiming a live update after a failed poll", async () => {
    mockFetch(() => ({ ok: false, throws: true }));
    renderPage();

    await screen.findAllByText(/Check your connection and try again/i);
    expect(screen.queryByText(/Live · updated/)).toBeNull();
    expect(screen.getByText(/Couldn't reach the server/i)).toBeTruthy();
  });

  it("does not let a slow failure undo the retry that overtook it", async () => {
    let personsCall = 0;
    const user = userEvent.setup();
    mockFetch((url) => {
      if (url.includes("/api/persons/unknown")) return okEmpty;
      if (url.includes("/api/persons")) {
        personsCall += 1;
        // The first (in-flight) load fails, but only after the retry has
        // already landed a good result.
        return personsCall === 1
          ? { ok: false, status: 500, json: { error: "slow failure" }, delayMs: 400 }
          : {
              ok: true,
              json: [
                { id: "p1", displayName: "Carol", bondLevel: "acquaintance", channelMappings: [] },
              ],
            };
      }
      return okEmpty;
    });
    renderPage();

    await user.click(screen.getByRole("button", { name: "Refresh" }));
    expect(await screen.findByText("Carol")).toBeTruthy();

    expect(screen.getByText(/Live · updated/)).toBeTruthy();

    // Let the stale request settle: it must not resurrect the error, in the
    // section or in the header's freshness line.
    await new Promise((resolve) => setTimeout(resolve, 600));
    expect(screen.queryByText("slow failure")).toBeNull();
    expect(screen.queryByText(/couldn't (refresh|load)/i)).toBeNull();
    expect(screen.getByText(/Live · updated/)).toBeTruthy();
    expect(screen.getByText("Carol")).toBeTruthy();
  });

  it("reports a partial failure as partial, not as a total outage", async () => {
    mockFetch((url) => {
      if (url.includes("/api/whatsapp/contacts")) return "reject";
      return okEmpty;
    });
    renderPage();

    expect(await screen.findByText("Some sections couldn't load")).toBeTruthy();
    expect(screen.queryByText(/Couldn't reach the server/i)).toBeNull();
    // The sections that did load render their own state, not an error.
    expect(screen.getByText("No known persons yet")).toBeTruthy();
  });

  it("still renders the existing empty states for a successful but empty response", async () => {
    mockFetch(() => okEmpty);
    renderPage();

    expect(await screen.findByText("No known persons yet")).toBeTruthy();
    expect(screen.getByText("No unmapped senders")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Try again" })).toBeNull();
    expect(screen.getByText(/Live · updated/)).toBeTruthy();
  });
});

describe("PeoplePage WhatsApp section", () => {
  it("keeps the section with an empty state that names the cause when no contacts sync", async () => {
    mockFetch(() => ({ ok: true, json: [] }));
    renderPage();

    expect(await screen.findByText("WhatsApp contacts")).toBeTruthy();
    expect(screen.getByText("No WhatsApp contacts")).toBeTruthy();
    // Names the likely cause and points at Settings, without asserting a
    // connection state the client can't confirm.
    expect(screen.getByText(/Nothing has synced yet — if WhatsApp isn't linked/i)).toBeTruthy();
  });

  it("shows the section loading rather than empty while the first load is in flight", async () => {
    mockFetch(() => ({ ok: true, pending: true }));
    renderPage();

    expect(await screen.findByText("Loading contacts…")).toBeTruthy();
    expect(screen.queryByText("No WhatsApp contacts")).toBeNull();
  });

  it("keeps the section with an error state when the contacts endpoint fails", async () => {
    mockFetch((url) => {
      if (url.includes("/api/whatsapp/contacts")) {
        return { ok: false, status: 400, json: { error: "contacts unavailable" } };
      }
      return { ok: true, json: [] };
    });
    renderPage();

    expect(await screen.findByText("WhatsApp contacts")).toBeTruthy();
    expect(screen.getByText("contacts unavailable")).toBeTruthy();
    expect(screen.queryByText("No WhatsApp contacts")).toBeNull();
  });
});

describe("PeoplePage messages dialog load failures", () => {
  it("shows an error with a retry instead of an empty thread", async () => {
    let messagesFail = true;
    const user = userEvent.setup();
    mockFetch((url) => {
      if (url.includes("/messages")) {
        return messagesFail
          ? { ok: false, status: 500, json: {} }
          : {
              ok: true,
              json: [
                {
                  id: "m1",
                  senderJid: null,
                  fromMe: false,
                  timestamp: 1_700_000_000,
                  type: "text",
                  text: "years of history",
                  hasMedia: false,
                  pushName: null,
                  reactsToId: null,
                },
              ],
            };
      }
      return waRoutes(url);
    });
    renderPage();

    expect(await screen.findByText("Bob")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Messages" }));

    expect(await screen.findByText("Couldn't load messages")).toBeTruthy();
    expect(screen.queryByText("No messages yet")).toBeNull();

    messagesFail = false;
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("years of history")).toBeTruthy();
    expect(screen.queryByText("Couldn't load messages")).toBeNull();
  });

  it("keeps a genuinely empty thread on its existing empty state", async () => {
    const user = userEvent.setup();
    mockFetch(waRoutes);
    renderPage();

    expect(await screen.findByText("Bob")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Messages" }));

    expect(await screen.findByText("No messages yet")).toBeTruthy();
    expect(screen.queryByText("Couldn't load messages")).toBeNull();
  });

  it("does not clear an optimistic bubble when a poll fails", async () => {
    let messagesFail = false;
    const user = userEvent.setup();
    mockFetch((url, method) => {
      if (url.includes("/messages")) {
        return messagesFail ? { ok: false, status: 500, json: {} } : { ok: true, json: [] };
      }
      if (url.includes("/send") && method === "POST") {
        messagesFail = true;
        return { ok: true, json: { ok: true } };
      }
      return waRoutes(url);
    });
    renderPage();

    expect(await screen.findByText("Bob")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Messages" }));
    await user.type(await screen.findByPlaceholderText("Type a message"), "still here");
    await user.click(screen.getByRole("button", { name: "Send" }));

    // The post-send refetch lands ~1.2s later and fails: the failure is
    // reported, and the optimistic bubble survives it.
    expect(
      await screen.findByText("Couldn't load messages", undefined, { timeout: 4_000 }),
    ).toBeTruthy();
    expect(screen.getByText("still here")).toBeTruthy();
    expect(screen.queryByText("No messages yet")).toBeNull();
  });

  it("cancels a superseded load so its failure can't land after a newer success", async () => {
    // The dialog's reads overlap — the opening load, the 4s poll, the post-send
    // refetch and the retry button. A slow failure among them must never land
    // on top of a newer success, which is why the thread is read through the
    // query layer: it supersedes the older request instead of racing it.
    const thread = (text: string) => [
      {
        id: `m-${text}`,
        senderJid: "5551234@s.whatsapp.net",
        fromMe: false,
        timestamp: 1_700_000_000,
        type: "text",
        text,
        hasMedia: false,
        pushName: "Bob",
        reactsToId: null,
      },
    ];
    let messagesCall = 0;
    const user = userEvent.setup();
    const calls = mockFetch((url, method) => {
      if (url.includes("/messages")) {
        messagesCall += 1;
        if (messagesCall === 1) return { ok: true, json: thread("first") };
        // The second read is slow and fails; the third overtakes it.
        return messagesCall === 2
          ? { ok: false, status: 500, json: {}, delayMs: 1_500 }
          : { ok: true, json: thread("second") };
      }
      if (url.includes("/send") && method === "POST") return { ok: true, json: { ok: true } };
      return waRoutes(url);
    });
    renderPage();

    expect(await screen.findByText("Bob")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Messages" }));
    expect(await screen.findByText("first")).toBeTruthy();

    // Two sends, so their post-send refetches overlap: the second supersedes
    // the first, which is still in flight and about to fail.
    const composer = await screen.findByPlaceholderText("Type a message");
    await user.type(composer, "one");
    await user.click(screen.getByRole("button", { name: "Send" }));
    await user.type(composer, "two");
    await user.click(screen.getByRole("button", { name: "Send" }));

    expect(await screen.findByText("second", undefined, { timeout: 4_000 })).toBeTruthy();
    // Let the superseded failure's original deadline pass.
    await new Promise((resolve) => setTimeout(resolve, 1_200));
    expect(screen.queryByText("Couldn't load messages")).toBeNull();
    expect(screen.getByText("second")).toBeTruthy();
    expect(calls.filter((c) => c.url.includes("/messages")).some((c) => c.aborted)).toBe(true);
  }, 15_000);
});

const liThread = {
  threadId: "2-abc==",
  threadUrl: "https://www.linkedin.com/messaging/thread/2-abc==/",
  personName: "Ada Lovelace",
  conversationName: null,
  lastMessagePreview: "See you Thursday",
  lastMessageAt: Math.floor(Date.now() / 1000) - 3600,
  unread: true,
  isGroup: false,
  participantCount: 2,
  counterpartyType: "member",
  category: "INBOX,PRIMARY_INBOX",
  messageCount: 2,
};

const liMessages = [
  {
    messageId: "li-m1",
    senderName: "Ada Lovelace",
    senderHeadline: "Engineer",
    senderProfileUrl: "https://www.linkedin.com/in/ada/",
    senderIsSelf: false,
    timestamp: Math.floor(Date.now() / 1000) - 7200,
    text: "Great meeting you!",
    subject: "Following up",
    reactionCount: null,
  },
  {
    messageId: "li-m2",
    senderName: "Rome Guardian",
    senderHeadline: null,
    senderProfileUrl: null,
    senderIsSelf: true,
    timestamp: Math.floor(Date.now() / 1000) - 3600,
    text: "See you Thursday",
    subject: null,
    reactionCount: null,
  },
];

describe("PeoplePage LinkedIn section", () => {
  it("keeps the section with an empty state that names the cause when nothing syncs", async () => {
    mockFetch(() => ({ ok: true, json: [] }));
    renderPage();

    expect(await screen.findByText("LinkedIn messages")).toBeTruthy();
    expect(screen.getByText("No LinkedIn conversations")).toBeTruthy();
    expect(screen.getByText(/Nothing has synced yet — if LinkedIn isn't connected/i)).toBeTruthy();
  });

  it("keeps the section with an error state when the threads endpoint fails", async () => {
    mockFetch((url) => {
      if (url.includes("/api/linkedin/threads")) {
        return { ok: false, status: 400, json: { error: "threads unavailable" } };
      }
      return { ok: true, json: [] };
    });
    renderPage();

    expect(await screen.findByText("LinkedIn messages")).toBeTruthy();
    expect(await screen.findByText("threads unavailable")).toBeTruthy();
    expect(screen.queryByText("No LinkedIn conversations")).toBeNull();
  });

  it("group badges come from isGroup alone, never from conversationName", async () => {
    // A legacy 1:1 row can carry the counterparty's name in conversationName
    // (the producer's old display ladder) with isGroup unknown; a real group
    // can lack a personName entirely. Only the flag may decide.
    const legacyOneToOne = {
      ...liThread,
      threadId: "2-legacy==",
      personName: "Evan Ye",
      conversationName: "Evan Ye",
      isGroup: null,
    };
    const group = {
      ...liThread,
      threadId: "2-group==",
      personName: null,
      conversationName: "Founder pitch review",
      isGroup: true,
      participantCount: 3,
      unread: false,
    };
    mockFetch((url) => {
      if (url.includes("/api/linkedin/threads")) return { ok: true, json: [legacyOneToOne, group] };
      return { ok: true, json: [] };
    });
    renderPage();

    expect(await screen.findByText("Evan Ye")).toBeTruthy();
    // The group card titles itself from the conversation title.
    expect(screen.getByText("Founder pitch review")).toBeTruthy();
    // Exactly one badge, on the group card — the legacy 1:1 gets none.
    expect(screen.getAllByText("Group conversation")).toHaveLength(1);
  });

  it("opens the thread dialog with mirrored messages and a reply composer", async () => {
    const user = userEvent.setup();
    mockFetch((url) => {
      if (url.includes("/api/linkedin/threads/") && url.includes("/messages")) {
        return { ok: true, json: liMessages };
      }
      if (url.includes("/api/linkedin/threads")) return { ok: true, json: [liThread] };
      return { ok: true, json: [] };
    });
    renderPage();

    expect(await screen.findByText("Ada Lovelace")).toBeTruthy();
    expect(screen.getByText("Unread")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Messages" }));

    expect(await screen.findByText("Great meeting you!")).toBeTruthy();
    // The InMail subject renders as its own line above the body.
    expect(screen.getByText("Following up")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Open in LinkedIn" })).toBeTruthy();
    expect(screen.getByPlaceholderText("Reply on LinkedIn")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Send" })).toBeTruthy();
  });

  it("replies through the LinkedIn safe-send endpoint", async () => {
    const user = userEvent.setup();
    const calls = mockFetch((url) => {
      if (url.includes(`/api/linkedin/threads/${encodeURIComponent(liThread.threadId)}/send`)) {
        return { ok: true, json: { ok: true, recipient: "Ada Lovelace" } };
      }
      if (url.includes("/api/linkedin/threads/") && url.includes("/messages")) {
        return { ok: true, json: liMessages };
      }
      if (url.includes("/api/linkedin/threads")) return { ok: true, json: [liThread] };
      return { ok: true, json: [] };
    });
    renderPage();

    expect(await screen.findByText("Ada Lovelace")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Messages" }));
    expect(await screen.findByPlaceholderText("Reply on LinkedIn")).toBeTruthy();

    const composer = screen.getByPlaceholderText("Reply on LinkedIn");
    await user.type(composer, "Thursday works!");
    await user.click(screen.getByRole("button", { name: "Send" }));

    await waitFor(() =>
      expect(
        calls.some(
          (call) =>
            call.method === "POST" && call.url.includes("/api/linkedin/threads/2-abc%3D%3D/send"),
        ),
      ).toBe(true),
    );
    const send = calls.find(
      (call) =>
        call.method === "POST" && call.url.includes("/api/linkedin/threads/2-abc%3D%3D/send"),
    );
    expect(send?.body).toEqual({
      text: "Thursday works!",
    });
    expect(await screen.findByText("Thursday works!")).toBeTruthy();
  });
});

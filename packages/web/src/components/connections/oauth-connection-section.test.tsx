// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import i18n from "@/i18n";
import { OAuthConnectionSection } from "@/components/connections/oauth-connection-section";
import { buildConnectionCards, type ConnectionCard } from "@/lib/connection-cards";
import type { ApiConnection, ConnectHint, GrantDisplay, GrantState } from "@/lib/connections-api";

beforeAll(async () => {
  await i18n.changeLanguage("en");
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function githubCard(
  state: GrantState,
  {
    display = null,
    connect = { url: "https://example.com/oauth/github", available: true, unavailableReason: null },
    activeSetupCid,
  }: {
    display?: GrantDisplay | null;
    connect?: ConnectHint | null;
    activeSetupCid?: string;
  } = {},
): ConnectionCard {
  const connection: ApiConnection = {
    id: "conn-github",
    service: "github",
    label: "GitHub",
    grants: { user: state },
    display: { user: display },
    capabilities: {
      talk: { state: "unsupported" },
      act:
        state === "authorized"
          ? { state: "unlocked" }
          : { state: "needs-auth", missingGrants: ["user"] },
      watch: { state: "unsupported" },
    },
    connect,
    ...(activeSetupCid ? { setups: { user: activeSetupCid } } : {}),
  };
  const card = buildConnectionCards([connection]).find((entry) => entry.service === "github");
  if (!card) throw new Error("no github card");
  return card;
}

function renderSection(
  card: ConnectionCard,
  {
    onRefresh = () => {},
    onFlash = () => {},
  }: Partial<Record<"onRefresh" | "onFlash", () => void>> = {},
) {
  return render(
    <OAuthConnectionSection
      card={card}
      slot={card.slots[0]}
      role="primary"
      onRefresh={onRefresh}
      onFlash={onFlash}
    />,
  );
}

describe("OAuthConnectionSection", () => {
  it("renders + bullets, the privacy note, and a Connect button when not connected", () => {
    renderSection(githubCard("unauthorized"));
    expect(screen.getByText("This connection will let your agent")).toBeTruthy();
    expect(
      screen.getByText(
        "Work with your repositories, issues, pull requests, and project boards as you",
      ),
    ).toBeTruthy();
    // Static copy title before connecting.
    expect(screen.getByText("Your GitHub account")).toBeTruthy();
    // Privacy lock-box.
    expect(
      screen.getByText("You approve access on GitHub; you can disconnect here anytime."),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "Connect" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Disconnect" })).toBeNull();
  });

  it("shows the account identity, ✓ bullets, Reconnect + Disconnect when connected", () => {
    renderSection(
      githubCard("authorized", {
        display: {
          displayName: "Ada Lovelace",
          handle: "ada",
          email: "ada@example.com",
          avatarUrl: null,
        },
      }),
    );
    // Account identity becomes the card title.
    expect(screen.getByText("Ada Lovelace")).toBeTruthy();
    expect(screen.getByText("ada@example.com")).toBeTruthy();
    expect(screen.getByText("This connection lets your agent")).toBeTruthy();
    expect(screen.queryByText("Access active")).toBeNull();
    expect(screen.queryByText("Connected")).toBeNull();
    expect(screen.getByRole("button", { name: "Reconnect" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Disconnect" })).toBeTruthy();
  });

  it("marks a degraded grant as expired and promotes Reconnect to the primary action", () => {
    // The old client-side tokenExpiresAt clock is gone — "expired" is now the
    // grant ledger's own `degraded` state on the slot.
    renderSection(
      githubCard("degraded", {
        display: {
          displayName: "Ada Lovelace",
          handle: "ada",
          email: "ada@example.com",
          avatarUrl: null,
        },
      }),
    );
    expect(screen.getByText("ada@example.com")).toBeTruthy();
    expect(screen.getByText("Access expired — reconnect to keep it working")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Reconnect" })).toBeTruthy();
  });

  it("shows the unavailable reason and a disabled Connect when the service is unavailable", () => {
    renderSection(
      githubCard("unauthorized", {
        connect: { url: null, available: false, unavailableReason: "Not configured on this host." },
      }),
    );
    const button = screen.getByRole("button", { name: "Connect" }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    expect(screen.getByText("Not configured on this host.")).toBeTruthy();
  });

  it("Connect starts the setup and hands off to the broker redirect", async () => {
    const assign = vi.fn();
    vi.stubGlobal("location", { ...window.location, assign });
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(
      async () =>
        new Response(
          JSON.stringify({
            cid: "setup-1",
            reattached: false,
            state: { status: "awaiting-redirect", url: "https://broker/authorize?state=xyz" },
          }),
          { status: 200 },
        ),
    );
    renderSection(githubCard("unauthorized"));
    fireEvent.click(screen.getByRole("button", { name: "Connect" }));
    await waitFor(() => expect(assign).toHaveBeenCalledWith("https://broker/authorize?state=xyz"));
    // The connect drives the generic setup surface, not a bespoke provider route.
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/connections/conn-github/grants/user/setup",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("does NOT auto-forward on a passive reattach; offers manual resume + cancel", async () => {
    const assign = vi.fn();
    vi.stubGlobal("location", { ...window.location, assign });
    // The reattach poll returns a setup still parked at the broker hand-off.
    vi.spyOn(globalThis, "fetch").mockImplementation(
      async () =>
        new Response(
          JSON.stringify({
            state: { status: "awaiting-redirect", url: "https://broker/authorize?state=parked" },
          }),
          { status: 200 },
        ),
    );
    renderSection(githubCard("unauthorized", { activeSetupCid: "setup-parked" }));

    // The manual affordance renders (guardian can escape) and we are NOT bounced
    // back out to the broker.
    await waitFor(() => expect(screen.getByRole("button", { name: "Cancel" })).toBeTruthy());
    expect(screen.getByRole("button", { name: "Connect" })).toBeTruthy();
    expect(assign).not.toHaveBeenCalled();
  });

  it("Disconnect revokes the grant via the registry-native DELETE and refreshes", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(async () => new Response("{}", { status: 200 }));
    const onRefresh = vi.fn();
    renderSection(
      githubCard("authorized", {
        display: { displayName: "Ada Lovelace", handle: null, email: null, avatarUrl: null },
      }),
      { onRefresh },
    );
    fireEvent.click(screen.getByRole("button", { name: "Disconnect" }));
    await waitFor(() => expect(onRefresh).toHaveBeenCalled());
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/connections/conn-github/grants/user",
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("Reconnect force-starts the setup and hands off to a fresh broker redirect", async () => {
    const assign = vi.fn();
    vi.stubGlobal("location", { ...window.location, assign });
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(
      async () =>
        new Response(
          JSON.stringify({
            cid: "setup-2",
            reattached: false,
            state: { status: "awaiting-redirect", url: "https://broker/authorize?state=reauth" },
          }),
          { status: 200 },
        ),
    );
    renderSection(
      githubCard("authorized", {
        display: { displayName: "Ada Lovelace", handle: null, email: null, avatarUrl: null },
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Reconnect" }));
    await waitFor(() =>
      expect(assign).toHaveBeenCalledWith("https://broker/authorize?state=reauth"),
    );
    // Reconnect force-starts the same setup (force:true cancels-and-replaces).
    const call = fetchMock.mock.calls.find(
      ([url]) => url === "/api/connections/conn-github/grants/user/setup",
    );
    expect(call).toBeTruthy();
    expect(JSON.parse((call?.[1] as RequestInit).body as string)).toEqual({ force: true });
  });
});

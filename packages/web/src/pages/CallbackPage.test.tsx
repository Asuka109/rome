// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import i18n from "@/i18n";
import CallbackPage from "./CallbackPage";

// The /callback screen tries setup resume first (`POST /api/setups/return`,
// correlated by state)
// and falls back to the legacy `/oauth/redeem` — the sign-in mechanic that keeps
// that route shared. What it SHOWS on failure is also a contract: a broker that
// attaches a readable error_description gets relayed verbatim, while a bare RFC
// 6749 code (older broker, deploy skew) is translated instead of leaking
// "invalid_grant" as the only explanation.

beforeAll(async () => {
  await i18n.changeLanguage("en");
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function renderCallback(search: string) {
  return render(
    <MemoryRouter initialEntries={[`/callback${search}`]}>
      <CallbackPage />
    </MemoryRouter>,
  );
}

/** Surfaces wherever the callback navigated to, so a test can assert the
 *  landing path the guardian actually ends up on. */
function LocationProbe() {
  const location = useLocation();
  return <div data-testid="landed-on">{`${location.pathname}${location.search}`}</div>;
}

/** Render the callback inside a router that reports the post-navigation path. */
function renderCallbackAndTrackLanding(search: string) {
  return render(
    <MemoryRouter initialEntries={[`/callback${search}`]}>
      <Routes>
        <Route path="/callback" element={<CallbackPage />} />
        <Route path="*" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>,
  );
}

/** Route the fetch mock by URL so the two legs (setup return, legacy redeem) can
 *  be stubbed independently. */
function stubFetch(handlers: { setupReturn?: () => Response; redeem?: () => Response }) {
  return vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    const url = typeof input === "string" ? input : (input as Request).url;
    if (url.includes("/api/setups/return")) {
      return (
        handlers.setupReturn?.() ??
        new Response(JSON.stringify({ matched: false }), { status: 404 })
      );
    }
    if (url.includes("/api/oauth/redeem")) {
      return handlers.redeem?.() ?? new Response("{}", { status: 200 });
    }
    return new Response("{}", { status: 200 });
  });
}

function stubRedeemFailure(error: string) {
  // The realistic sign-in scenario: the setup-return is a DEFINITIVE no-match
  // (404) — no setup owns this state — so the callback falls back to the legacy
  // redeem, which surfaces the broker error. (A 5xx on the return leg would be
  // ambiguous and route to integrations instead; see the routing suite.)
  return stubFetch({
    setupReturn: () => new Response(JSON.stringify({ matched: false }), { status: 404 }),
    redeem: () =>
      new Response(JSON.stringify({ error }), {
        status: 502,
        headers: { "Content-Type": "application/json" },
      }),
  });
}

describe("CallbackPage error display", () => {
  it("translates a bare invalid_grant from the redeem response", async () => {
    stubRedeemFailure("invalid_grant");
    renderCallback("?handoff=h-bare-code&state=s-bare-code");

    expect(await screen.findByText(/Rome Cloud rejected this sign-in link/i)).toBeTruthy();
    expect(screen.queryByText("invalid_grant")).toBeNull();
  });

  it("shows the broker's readable error_description verbatim", async () => {
    stubRedeemFailure(
      "This sign-in link expired before Rome could redeem it. Please try connecting again.",
    );
    renderCallback("?handoff=h-described&state=s-described");

    expect(await screen.findByText(/expired before Rome could redeem it/i)).toBeTruthy();
  });

  it("translates a bare invalid_grant arriving as a provider error param", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    renderCallback("?error=invalid_grant");

    expect(await screen.findByText(/Rome Cloud rejected this sign-in link/i)).toBeTruthy();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe("CallbackPage return-leg routing", () => {
  it("delivers the return leg to a suspended setup and does NOT hit the legacy redeem", async () => {
    const fetchMock = stubFetch({
      setupReturn: () =>
        new Response(
          JSON.stringify({
            matched: true,
            cid: "setup-1",
            accepted: true,
            state: { status: "presenting", view: { progress: true } },
          }),
          { status: 200 },
        ),
    });
    renderCallback("?handoff=h-setup&state=s-setup-live");

    await vi.waitFor(() =>
      expect(fetchMock.mock.calls.some(([url]) => String(url).includes("/api/setups/return"))).toBe(
        true,
      ),
    );
    // A matched setup consumes the leg; the sign-in fallback is never reached.
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes("/api/oauth/redeem"))).toBe(
      false,
    );
  });

  it("returns the guardian to the connected service's own page, not the retired Integrations tab", async () => {
    stubFetch({
      setupReturn: () =>
        new Response(
          JSON.stringify({
            matched: true,
            cid: "setup-gh",
            service: "github",
            accepted: true,
            state: { status: "presenting", view: { progress: true } },
          }),
          { status: 200 },
        ),
    });
    renderCallbackAndTrackLanding("?handoff=h-gh&state=s-gh-live");

    // The connection detail page is the only surface that re-attaches to the
    // still-redeeming setup and settles it to connected.
    const landed = await screen.findByTestId("landed-on");
    expect(landed.textContent).toBe("/settings/connections/github");
  });

  it("lands on the connections list when the matched setup names no service", async () => {
    stubFetch({
      setupReturn: () =>
        new Response(
          JSON.stringify({
            matched: true,
            cid: "setup-anon",
            accepted: true,
            state: { status: "presenting", view: { progress: true } },
          }),
          { status: 200 },
        ),
    });
    renderCallbackAndTrackLanding("?handoff=h-anon&state=s-anon-live");

    const landed = await screen.findByTestId("landed-on");
    expect(landed.textContent).toBe("/settings/connections");
  });

  it("falls back to the legacy redeem when no setup awaits the state (definitive 404)", async () => {
    const fetchMock = stubFetch({
      setupReturn: () => new Response(JSON.stringify({ matched: false }), { status: 404 }),
      redeem: () => new Response(JSON.stringify({ nextPath: "/" }), { status: 200 }),
    });
    renderCallback("?handoff=h-signin&state=s-signin");

    await vi.waitFor(() =>
      expect(fetchMock.mock.calls.some(([url]) => String(url).includes("/api/oauth/redeem"))).toBe(
        true,
      ),
    );
  });

  it("does NOT dead-end on redeem when the return leg fails ambiguously (5xx)", async () => {
    const fetchMock = stubFetch({
      setupReturn: () => new Response(JSON.stringify({ error: "boom" }), { status: 500 }),
      redeem: () => new Response(JSON.stringify({ nextPath: "/" }), { status: 200 }),
    });
    renderCallback("?handoff=h-amb&state=s-amb");

    await vi.waitFor(() =>
      expect(fetchMock.mock.calls.some(([url]) => String(url).includes("/api/setups/return"))).toBe(
        true,
      ),
    );
    // Ambiguous → the setup may have connected server-side; route to integrations
    // rather than failing on the already-consumed handoff.
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes("/api/oauth/redeem"))).toBe(
      false,
    );
    expect(screen.queryByText("boom")).toBeNull();
  });

  it("shows a failed setup's reason without falling back to redeem", async () => {
    const fetchMock = stubFetch({
      setupReturn: () =>
        new Response(
          JSON.stringify({
            matched: true,
            cid: "setup-2",
            accepted: true,
            state: { status: "failed", reason: "Authorization was declined." },
          }),
          { status: 200 },
        ),
    });
    renderCallback("?error=access_denied&state=s-denied");

    expect(await screen.findByText(/Authorization was declined/i)).toBeTruthy();
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes("/api/oauth/redeem"))).toBe(
      false,
    );
  });
});

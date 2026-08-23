// @vitest-environment jsdom
//
// The useSetup polling runner drops local state on reset so the card can offer
// a fresh Connect, and a
// polled setup that has vanished (404) clears itself rather than sticking on a
// stale terminal view.

import { afterEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { useSetup } from "@/components/setup/use-setup";

afterEach(() => vi.restoreAllMocks());

describe("useSetup stale-state handling", () => {
  it("reset() drops cid and state so a fresh Connect is possible", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ state: { status: "presenting", view: { title: "x" } } }), {
        status: 200,
      }),
    );
    const { result } = renderHook(() =>
      useSetup({ idOrService: "discord", grant: "bot", activeCid: "cid-1" }),
    );
    // Adopted the discovered setup and polled its state.
    await waitFor(() => expect(result.current.state?.status).toBe("presenting"));
    expect(result.current.cid).toBe("cid-1");

    act(() => result.current.reset());
    expect(result.current.cid).toBeNull();
    expect(result.current.state).toBeNull();
  });

  it("clears itself when the polled setup has vanished (404)", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}", { status: 404 }));
    const { result } = renderHook(() =>
      useSetup({ idOrService: "discord", grant: "bot", activeCid: "gone" }),
    );
    // The immediate poll 404s → the hook resets so the card is not stuck.
    await waitFor(() => expect(result.current.cid).toBeNull());
    expect(result.current.state).toBeNull();
  });
});

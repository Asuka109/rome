import { afterEach, describe, expect, it, vi } from "vitest";
import {
  accessControlChecksPassed,
  describeTailscaleCertError,
  probeTailnetReachable,
} from "@/lib/access-control-client";

describe("accessControlChecksPassed", () => {
  it("requires HTTPS and a successful tailnet reachability check", () => {
    expect(accessControlChecksPassed(true, true)).toBe(true);
    expect(accessControlChecksPassed(true, false)).toBe(false);
    expect(accessControlChecksPassed(false, true)).toBe(false);
    expect(accessControlChecksPassed(null, true)).toBe(false);
  });
});

describe("probeTailnetReachable", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns true when the HTTPS health check succeeds", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    await expect(probeTailnetReachable("rome.tailnet.ts.net")).resolves.toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://rome.tailnet.ts.net/api/health",
      expect.objectContaining({ mode: "cors" }),
    );
  });

  it("returns false when the HTTPS health check fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network error")));

    await expect(probeTailnetReachable("rome.tailnet.ts.net")).resolves.toBe(false);
  });
});

describe("describeTailscaleCertError", () => {
  it("returns a specific message for non-eligible cert domains", () => {
    expect(describeTailscaleCertError("domain_not_cert_eligible")).toContain(
      "Enable MagicDNS and HTTPS certificates",
    );
  });

  it("returns a generic setup message for other cert failures", () => {
    expect(describeTailscaleCertError("some tailscale stderr")).toContain(
      "could not be issued automatically",
    );
  });
});

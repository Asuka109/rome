// @rstest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, rs } from "@rstest/core";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import i18n from "@/i18n";
import { PairingRequestCard } from "@/components/pairing-requests";

beforeAll(async () => i18n.changeLanguage("en"));
afterEach(() => cleanup());

describe("PairingRequestCard", () => {
  it("keeps approve primary and hides capability-derived alternatives until requested", async () => {
    const onDecision = rs.fn(async () => {});
    render(
      <PairingRequestCard
        request={{
          id: "pair-1",
          channel: "telegram",
          channelUserId: "42",
          displayName: "Ada",
          status: "pending",
          createdAt: new Date(0).toISOString(),
          expiresAt: new Date(60_000).toISOString(),
          pairingUrl: "https://rome.example/pairing/pair-1#token=secret",
          cli: { approve: "curl approve", reject: "curl reject" },
        }}
        onDecision={onDecision}
      />,
    );
    expect(screen.getByText("Ada")).toBeTruthy();
    expect(screen.getByText("curl approve").closest("details")?.open).toBe(false);
    fireEvent.click(screen.getByText("Other ways to approve"));
    expect(screen.getByText("curl approve").closest("details")?.open).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Approve" }));
    await rs.waitFor(() => expect(onDecision).toHaveBeenCalledWith("approve"));
    expect((await screen.findByRole("status")).textContent).toBe("Account approved.");
  });
});

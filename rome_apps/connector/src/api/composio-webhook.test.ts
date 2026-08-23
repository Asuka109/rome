import { describe, expect, it, vi } from "vitest";

import {
  ensureComposioWebhookRegistered,
  RelayWebhookUnavailableError,
} from "./composio-webhook.js";

describe("ensureComposioWebhookRegistered", () => {
  it("registers Composio at the exact relay deposit URL and stores fresh signing material", async () => {
    const setWebhookUrl = vi.fn().mockResolvedValue({ id: "wh_1", secret: "whsec_1" });
    const set = vi.fn().mockResolvedValue(undefined);

    await expect(
      ensureComposioWebhookRegistered({
        client: { setWebhookUrl },
        appSettings: { set },
        settings: { get: async () => ({ depositUrl: "https://relay.example/h/mailbox" }) },
      }),
    ).resolves.toEqual({ webhookUrl: "https://relay.example/h/mailbox" });

    expect(setWebhookUrl).toHaveBeenCalledExactlyOnceWith("https://relay.example/h/mailbox");
    expect(set).toHaveBeenNthCalledWith(1, "webhookSecret", "whsec_1");
    expect(set).toHaveBeenNthCalledWith(2, "webhookEndpointId", "wh_1");
  });

  it("does not call Composio or mutate local state when Relay is unavailable", async () => {
    const setWebhookUrl = vi.fn();
    const set = vi.fn();

    await expect(
      ensureComposioWebhookRegistered({
        client: { setWebhookUrl },
        appSettings: { set },
        settings: { get: async () => null },
      }),
    ).rejects.toBeInstanceOf(RelayWebhookUnavailableError);

    expect(setWebhookUrl).not.toHaveBeenCalled();
    expect(set).not.toHaveBeenCalled();
  });

  it("rejects a non-HTTPS relay deposit URL before registering it with Composio", async () => {
    const setWebhookUrl = vi.fn();

    await expect(
      ensureComposioWebhookRegistered({
        client: { setWebhookUrl },
        appSettings: { set: vi.fn() },
        settings: { get: async () => ({ depositUrl: "http://relay.example/h/mailbox" }) },
      }),
    ).rejects.toThrow("must use HTTPS");

    expect(setWebhookUrl).not.toHaveBeenCalled();
  });
});

import type { RomeAppApiRequest, RomeAppContext } from "@rome-os/app-runtime";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  ensureWebhookRegistered: vi.fn(),
  readSessionApiKey: vi.fn(),
  client: {
    ensureAuthConfig: vi.fn(),
    ensureConnection: vi.fn(),
  },
}));

vi.mock("./composio-login.js", async (importActual) => ({
  ...(await importActual<typeof import("./composio-login.js")>()),
  readSessionApiKey: mocks.readSessionApiKey,
}));

vi.mock("./composio-webhook.js", async (importActual) => ({
  ...(await importActual<typeof import("./composio-webhook.js")>()),
  ensureComposioWebhookRegistered: mocks.ensureWebhookRegistered,
}));

vi.mock("./composio-client.js", async (importActual) => {
  const actual = await importActual<typeof import("./composio-client.js")>();
  return {
    ...actual,
    ComposioClient: class {
      constructor() {
        return mocks.client;
      }
    },
  };
});

import { createApiHandler } from "./index.js";

describe("connector API webhook self-healing", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.readSessionApiKey.mockResolvedValue("test-api-key");
    mocks.ensureWebhookRegistered.mockRejectedValue(new Error("relay unavailable"));
    mocks.client.ensureAuthConfig.mockResolvedValue("auth-config-1");
    mocks.client.ensureConnection.mockResolvedValue({
      kind: "redirect",
      url: "https://platform.composio.dev/connect",
    });
  });

  it("continues the OAuth connection when webhook self-healing fails", async () => {
    const warn = vi.fn();
    const ctx = {
      db: {},
      repositories: { settings: {} },
      log: { warn, error: vi.fn(), info: vi.fn() },
    } as unknown as RomeAppContext;
    const request = {
      method: "POST",
      path: ["connectors"],
      headers: { host: "rome.test" },
      body: new TextEncoder().encode(JSON.stringify({ provider: "notion" })),
    } as unknown as RomeAppApiRequest;

    const response = await createApiHandler(ctx).handle(request);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      provider: "notion",
      authorizationUrl: "https://platform.composio.dev/connect",
    });
    expect(mocks.ensureWebhookRegistered).toHaveBeenCalledOnce();
    expect(mocks.client.ensureAuthConfig).toHaveBeenCalledWith("notion");
    expect(warn).toHaveBeenCalledWith(
      "connectors.start: webhook registration failed; continuing OAuth",
      expect.objectContaining({ provider: "notion", error: "relay unavailable" }),
    );
  });
});

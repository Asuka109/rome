import type { ActionConfig, AppActionRuntimeDeps } from "@rome-os/app-runtime";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  ensureWebhookRegistered: vi.fn(),
  loadConnectorClient: vi.fn(),
}));

vi.mock("../shared.js", async (importActual) => ({
  ...(await importActual<typeof import("../shared.js")>()),
  loadConnectorClient: mocks.loadConnectorClient,
}));

vi.mock("../api/composio-webhook.js", async (importActual) => ({
  ...(await importActual<typeof import("../api/composio-webhook.js")>()),
  ensureComposioWebhookRegistered: mocks.ensureWebhookRegistered,
}));

import { createAction } from "./connector-connect/index.js";

const config: ActionConfig = {
  name: "connector_connect",
  type: "custom",
  description: "Connect a toolkit",
  complexity: "simple",
  speed: "fast",
  reliability: "medium",
  sideEffects: "read-only",
};

describe("connector_connect webhook self-healing", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.loadConnectorClient.mockResolvedValue({
      findActiveConnectedAccount: vi.fn().mockResolvedValue({ kind: "ok", id: "ca_1" }),
    });
    mocks.ensureWebhookRegistered.mockRejectedValue(new Error("relay unavailable"));
  });

  it("keeps an existing connection usable when webhook self-healing fails", async () => {
    const deps = {
      appContext: { db: {}, repositories: { settings: {} } },
    } as unknown as AppActionRuntimeDeps;

    const result = await createAction(config, deps).execute({ toolkit: "notion" });

    expect(result).toEqual({ status: "ok", data: { toolkit: "notion", status: "connected" } });
    expect(mocks.ensureWebhookRegistered).toHaveBeenCalledOnce();
  });
});

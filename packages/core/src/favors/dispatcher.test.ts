import { describe, expect, it, vi } from "vitest";
import { FavorDispatchRunner } from "./dispatcher.js";
import type { FavorActionRequestView, FavorService } from "./types.js";
import type { ActionEngine } from "../actions/engine.js";

function requestView(overrides: Partial<FavorActionRequestView> = {}): FavorActionRequestView {
  const now = new Date("2026-01-01T00:00:00.000Z").toISOString();
  return {
    id: "favor-request-1",
    payerUserId: "payer-1",
    requestorUserId: "requestor-1",
    recipientUserId: "requestor-1",
    requesterInstanceId: "instance-1",
    requesterAppId: "app-1",
    requesterAppIdentity: {},
    actionName: "archive",
    definitionHash: "definition-hash",
    actionRefHash: "action-ref-hash",
    amount: 25,
    displayPayload: {},
    attribution: {},
    taskRef: null,
    status: "settled",
    dispatchStatus: "queued",
    dispatchAttemptCount: 0,
    dispatchClaimExpiresAt: null,
    idempotencyKey: "idem-1",
    failureReason: null,
    createdAt: now,
    expiresAt: now,
    decidedAt: now,
    settledAt: now,
    queuedAt: now,
    dispatchedAt: null,
    completedAt: null,
    updatedAt: now,
    ...overrides,
  };
}

function favorService(overrides: Partial<FavorService> = {}): FavorService {
  return {
    getBalance: vi.fn(),
    listLedger: vi.fn(),
    getActionRequest: vi.fn(),
    listActionRequests: vi.fn(),
    requestAction: vi.fn(),
    resolveActionRequest: vi.fn(),
    createRechargeCheckout: vi.fn(),
    syncActionRequirements: vi.fn(),
    syncActionRequests: vi.fn(async () => ({
      requests: [requestView()],
      nextCursor: "cursor-2",
    })),
    claimDispatch: vi.fn(
      async () =>
        ({
          status: "claimed",
          actionRequestId: "favor-request-1",
          claimToken: "claim-token",
          claimExpiresAt: new Date(Date.now() + 60_000).toISOString(),
          dispatchAttempt: 1,
          actionRef: {
            kind: "run_action",
            name: "archive_document",
            args: { documentId: "doc-1" },
          },
          actionRefHash: "action-ref-hash",
          definitionHash: "definition-hash",
          displayPayload: {},
        }) as const,
    ),
    renewDispatchClaim: vi.fn(),
    reportDispatchResult: vi.fn(async () => {}),
    listRechargePacks: vi.fn(async () => ({ packs: [] })),
    ...overrides,
  };
}

describe("FavorDispatchRunner", () => {
  it("does not contact Rome Cloud when instance enrollment is unavailable", async () => {
    const service = favorService();
    const run = vi.fn();
    const runner = new FavorDispatchRunner({
      favorService: service,
      actionEngine: { run } as unknown as ActionEngine,
      canSync: () => false,
    });

    await runner.runOnce();

    expect(service.syncActionRequests).not.toHaveBeenCalled();
    expect(run).not.toHaveBeenCalled();
  });

  it("claims settled favor requests, runs the referenced action, and reports success", async () => {
    const service = favorService();
    const run = vi.fn(async () => ({ status: "ok", data: { archived: true } as const }));
    const runner = new FavorDispatchRunner({
      favorService: service,
      actionEngine: { run } as unknown as ActionEngine,
    });

    await runner.runOnce();

    await vi.waitFor(() => {
      expect(service.reportDispatchResult).toHaveBeenCalledOnce();
    });
    expect(run).toHaveBeenCalledWith(
      "archive_document",
      { documentId: "doc-1" },
      {
        executionId: "favor-request-1",
        rootExecutionId: "favor-request-1",
        initiator: "favor:favor-request-1",
        sharedContext: {
          favorActionRequestId: "favor-request-1",
          favorActionRefHash: "action-ref-hash",
          favorDispatchAttempt: 1,
        },
      },
    );
    expect(service.reportDispatchResult).toHaveBeenCalledWith("favor-request-1", {
      claimToken: "claim-token",
      actionRefHash: "action-ref-hash",
      status: "succeeded",
      completedAt: expect.any(String),
      outputRef: { data: { archived: true } },
    });
  });

  it("reports an action failure when the local action returns an error envelope", async () => {
    const service = favorService();
    const run = vi.fn(async () => ({ status: "error", error: "document missing" }));
    const runner = new FavorDispatchRunner({
      favorService: service,
      actionEngine: { run } as unknown as ActionEngine,
    });

    await runner.runOnce();

    await vi.waitFor(() => {
      expect(service.reportDispatchResult).toHaveBeenCalledOnce();
    });
    expect(service.reportDispatchResult).toHaveBeenCalledWith("favor-request-1", {
      claimToken: "claim-token",
      actionRefHash: "action-ref-hash",
      status: "action_failed",
      completedAt: expect.any(String),
      error: {
        code: "error",
        message: "document missing",
        retryable: false,
      },
    });
  });
});

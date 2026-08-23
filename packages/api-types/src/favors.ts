// The `/api/favors/*` wire contract, shared by the route handlers that produce
// it, the dashboard that parses it, and the mock handlers that stand in for it.
// A page-local copy of these shapes typechecks green against a renamed field,
// so the contract lives here instead.

export interface FavorBalanceView {
  userId: string;
  available: number;
  lifetimeEarned: number;
  lifetimeSpent: number;
  updatedAt: string;
}

export type FavorLedgerKind =
  | "initial_grant"
  | "recharge"
  | "action_request_debit"
  | "action_request_credit"
  | "refund"
  | "operator_adjustment";

export interface FavorLedgerEntryView {
  id: string;
  userId: string;
  actionRequestId: string | null;
  rechargeId: string | null;
  amount: number;
  kind: FavorLedgerKind;
  operationKey: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface FavorLedgerPage {
  entries: FavorLedgerEntryView[];
  nextCursor: string | null;
}

export interface FavorRechargePackView {
  id: string;
  favors: number;
  displayPrice?: string;
}

export interface FavorRechargePackList {
  packs: FavorRechargePackView[];
}

/** Hosted checkout the recharge POST redirects the payer to. */
export interface FavorRechargeCheckout {
  url: string;
}

export type FavorActionRequestStatus = "pending" | "settled" | "declined" | "expired" | "failed";

export type FavorActionRequestDispatchStatus =
  | "blocked"
  | "queued"
  | "claimed"
  | "succeeded"
  | "action_failed";

export interface FavorActionRequestView {
  id: string;
  payerUserId: string | null;
  requestorUserId: string;
  recipientUserId: string;
  requesterInstanceId: string | null;
  requesterAppId: string;
  requesterAppIdentity: Record<string, unknown>;
  actionName: string;
  definitionHash: string;
  actionRefHash: string;
  amount: number;
  displayPayload: Record<string, unknown>;
  attribution: Record<string, unknown>;
  taskRef: Record<string, unknown> | null;
  status: FavorActionRequestStatus;
  dispatchStatus: FavorActionRequestDispatchStatus;
  dispatchAttemptCount: number;
  dispatchClaimExpiresAt: string | null;
  idempotencyKey: string;
  failureReason: string | null;
  createdAt: string;
  expiresAt: string;
  decidedAt: string | null;
  settledAt: string | null;
  queuedAt: string | null;
  dispatchedAt: string | null;
  completedAt: string | null;
  updatedAt: string;
}

export interface FavorActionRequestSyncPage {
  requests: FavorActionRequestView[];
  nextCursor: string;
}

export interface FavorActionAuthorization {
  authorizationUrl: string;
}

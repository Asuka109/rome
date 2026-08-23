export interface ActivityApprovalLike {
  type: string;
  status: "pending" | "approved" | "rejected" | "auto_approved";
  executionError: string | null;
  executedAt: string | null;
}

export interface ActivityExecutionLike {
  status: "running" | "success" | "error" | "pending_approval" | "cancelled";
  error: string | null;
}

export interface ActivityExecutionGroupLike {
  rootExecution: ActivityExecutionLike;
}

export interface ActivityWebhookInvocationLike {
  status: "accepted" | "running" | "success" | "error" | "pending_approval" | "cancelled";
  error: string | null;
  callbackStatus: "not_requested" | "pending" | "succeeded" | "failed";
  callbackError: string | null;
}

export type ActivityItemLike =
  | { kind: "approval"; data: ActivityApprovalLike }
  | { kind: "execution_group"; data: ActivityExecutionGroupLike }
  | { kind: "webhook_invocation"; data: ActivityWebhookInvocationLike };

export type StatusFilter =
  | "all"
  | "accepted"
  | "pending"
  | "approved"
  | "rejected"
  | "auto_approved"
  | "running"
  | "success"
  | "error"
  | "pending_approval"
  | "cancelled";

export function getApprovalDisplayStatus(approval: ActivityApprovalLike): string {
  if (approval.status === "approved" && approval.type === "action_execution") {
    if (approval.executionError) return "execution_failed";
    if (approval.executedAt) return "executed";
    return "awaiting_execution";
  }
  return approval.status;
}

export function hasActivityError(item: ActivityItemLike): boolean {
  if (item.kind === "approval") {
    return getApprovalDisplayStatus(item.data) === "execution_failed";
  }

  if (item.kind === "execution_group") {
    return item.data.rootExecution.status === "error" || item.data.rootExecution.error != null;
  }

  return (
    item.data.status === "error" ||
    item.data.error != null ||
    item.data.callbackStatus === "failed" ||
    item.data.callbackError != null
  );
}

export function matchesActivityFilter(item: ActivityItemLike, filter: StatusFilter): boolean {
  if (filter === "all") return true;
  if (filter === "error") return hasActivityError(item);
  if (item.kind === "approval") return item.data.status === filter;
  if (item.kind === "execution_group") {
    return item.data.rootExecution.status === filter;
  }
  return item.data.status === filter;
}

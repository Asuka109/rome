import type { ApprovalCardStatus, ApprovalRecord } from "@/lib/chat-types";

export function deriveCardStatus(
  initial: ApprovalCardStatus,
  record: ApprovalRecord | null,
): ApprovalCardStatus {
  if (!record) return initial;
  if (record.status === "rejected") return "rejected";
  if (record.status === "approved" || record.status === "auto_approved") {
    if (record.executionState === "succeeded") return "executed";
    if (record.executionState === "failed") return "failed";
    if (record.executionState === "running") return "executing";
    return "approved";
  }
  return "pending";
}

export function isTerminalCardStatus(status: ApprovalCardStatus): boolean {
  return status === "rejected" || status === "executed" || status === "failed";
}

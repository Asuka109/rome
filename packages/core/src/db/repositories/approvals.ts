import { and, eq, or } from "drizzle-orm";
import { v4 as uuid } from "uuid";
import { approvals } from "../schema.js";
import type { DrizzleDb } from "../index.js";
import { APPROVAL_TYPES, type ApprovalStatus, type ApprovalType } from "@rome/api-types/approvals";

type ApprovalRow = typeof approvals.$inferSelect;
type ResolveAction = "approve" | "reject";

export type ResolvePendingResult =
  | { outcome: "resolved"; approval: ApprovalRow }
  | { outcome: "not_found" }
  | { outcome: "already_resolved"; approval: ApprovalRow };

export type RetryExecutionResult =
  | { outcome: "queued"; approval: ApprovalRow }
  | { outcome: "not_found" }
  | { outcome: "not_retryable"; approval: ApprovalRow };

export class ApprovalsRepository {
  constructor(private db: DrizzleDb) {}

  async create(data: {
    type: ApprovalType;
    requestedBy: string;
    description: string;
    payload?: unknown;
    status?: ApprovalStatus;
  }) {
    // An app compiled against an older SDK still reaches this method with an
    // arbitrary string. Reject it here rather than persist a record no resolver
    // recognises: the row would sit pending forever, and the guardian would have
    // no control that could clear it.
    if (!APPROVAL_TYPES.includes(data.type)) {
      throw new Error(
        `Unknown approval type "${data.type}" — expected one of ${APPROVAL_TYPES.join(", ")}`,
      );
    }
    const id = uuid();
    const now = new Date();
    await this.db.insert(approvals).values({
      id,
      type: data.type,
      status: data.status ?? "pending",
      requestedBy: data.requestedBy,
      description: data.description,
      payload: data.payload ?? null,
      executionState: "idle",
      createdAt: now,
      resolvedAt: null,
      resolvedBy: null,
    });
    return id;
  }

  async findPending() {
    return this.db.select().from(approvals).where(eq(approvals.status, "pending"));
  }

  async findByType(type: ApprovalType) {
    return this.db.select().from(approvals).where(eq(approvals.type, type));
  }

  async findById(id: string) {
    const rows = await this.db.select().from(approvals).where(eq(approvals.id, id));
    return rows[0] ?? null;
  }

  async approve(id: string, resolvedBy: string = "guardian") {
    const rows = await this.db
      .update(approvals)
      .set({
        status: "approved",
        resolvedAt: new Date(),
        resolvedBy,
      })
      .where(and(eq(approvals.id, id), eq(approvals.status, "pending")))
      .returning();
    return rows.length > 0;
  }

  async reject(id: string, resolvedBy: string = "guardian") {
    const rows = await this.db
      .update(approvals)
      .set({
        status: "rejected",
        resolvedAt: new Date(),
        resolvedBy,
      })
      .where(and(eq(approvals.id, id), eq(approvals.status, "pending")))
      .returning();
    return rows.length > 0;
  }

  async resolvePending(
    id: string,
    action: ResolveAction,
    resolvedBy: string = "guardian",
  ): Promise<ResolvePendingResult> {
    const existing = await this.findById(id);
    if (!existing) {
      return { outcome: "not_found" };
    }

    const nextStatus = action === "approve" ? "approved" : "rejected";
    const shouldQueueExecution = action === "approve" && existing.type === "action_execution";

    const updated = await this.db
      .update(approvals)
      .set({
        status: nextStatus,
        resolvedAt: new Date(),
        resolvedBy,
        executionState: shouldQueueExecution ? "queued" : (existing.executionState ?? "idle"),
        executionError: shouldQueueExecution ? null : existing.executionError,
      })
      .where(and(eq(approvals.id, id), eq(approvals.status, "pending")))
      .returning();

    if (updated.length === 0) {
      return {
        outcome: "already_resolved",
        approval: (await this.findById(id)) ?? existing,
      };
    }

    return { outcome: "resolved", approval: updated[0] };
  }

  async claimExecution(id: string): Promise<boolean> {
    const rows = await this.db
      .update(approvals)
      .set({
        executionState: "running",
        executionError: null,
      })
      .where(
        and(
          eq(approvals.id, id),
          eq(approvals.status, "approved"),
          eq(approvals.executionState, "queued"),
        ),
      )
      .returning({ id: approvals.id });
    return rows.length > 0;
  }

  async markExecuted(id: string) {
    await this.db
      .update(approvals)
      .set({
        executedAt: new Date(),
        executionState: "succeeded",
        executionError: null,
      })
      .where(eq(approvals.id, id));
  }

  async markExecutionFailed(id: string, error: string) {
    await this.db
      .update(approvals)
      .set({
        executionState: "failed",
        executionError: error,
      })
      .where(eq(approvals.id, id));
  }

  /** Returns rootExecutionIds from action_execution approvals that are not yet in a terminal state. */
  async findActiveRootExecutionIds(): Promise<string[]> {
    const rows = await this.db
      .select({ payload: approvals.payload })
      .from(approvals)
      .where(
        and(
          eq(approvals.type, "action_execution"),
          or(
            eq(approvals.status, "pending"),
            and(
              eq(approvals.status, "approved"),
              or(
                eq(approvals.executionState, "idle"),
                eq(approvals.executionState, "queued"),
                eq(approvals.executionState, "running"),
                eq(approvals.executionState, "failed"),
              ),
            ),
          ),
        ),
      );
    const ids: string[] = [];
    for (const row of rows) {
      const payload = row.payload as Record<string, unknown> | null;
      if (payload && typeof payload.rootExecutionId === "string") {
        ids.push(payload.rootExecutionId);
      }
    }
    return ids;
  }

  async retryFailedExecution(id: string): Promise<RetryExecutionResult> {
    const existing = await this.findById(id);
    if (!existing) {
      return { outcome: "not_found" };
    }

    const rows = await this.db
      .update(approvals)
      .set({
        executionState: "queued",
        executionError: null,
        executedAt: null,
      })
      .where(
        and(
          eq(approvals.id, id),
          eq(approvals.type, "action_execution"),
          eq(approvals.status, "approved"),
          eq(approvals.executionState, "failed"),
        ),
      )
      .returning();

    if (rows.length === 0) {
      return {
        outcome: "not_retryable",
        approval: (await this.findById(id)) ?? existing,
      };
    }

    return { outcome: "queued", approval: rows[0] };
  }
}

export function createApprovalsRepository(db: DrizzleDb) {
  return new ApprovalsRepository(db);
}

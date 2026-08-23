// Dashboard identity wire contract. Access control: docs/architecture/access-control.md.
export type DashboardIdentity =
  | {
      kind: "guardian";
      userId: string;
      /** Human-facing guardian name. Callers must not fall back to `userId` when it is null. */
      displayName: string | null;
      avatarUrl: string | null;
    }
  | { kind: "visitor"; accountId: string; email: string; avatarUrl: string | null }
  | { kind: "anonymous" };

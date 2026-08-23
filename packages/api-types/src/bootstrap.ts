// SPA bootstrap wire states. Access-control contract: docs/architecture/access-control.md.

export type BootstrapPhase = BootstrapState["phase"];

export type BootstrapState =
  /** Enrollment is available, but the instance has no durable token. */
  | { phase: "unenrolled" }
  /** Local-first instance with no guardian seat. */
  | { phase: "needs-account" }
  /** A guardian must establish a local session. */
  | { phase: "needs-signin"; method: "local"; dashboardVisitorAccess?: boolean }
  | {
      phase: "needs-signin";
      method: "cloud";
      /** Whether the sign-in view may offer a local-password fallback. */
      localPasswordAvailable: boolean;
      dashboardVisitorAccess?: boolean;
    }
  | { phase: "needs-onboarding" }
  | { phase: "ready" };

/**
 * request_approval_demo — Test fixture for the approval flow.
 *
 * No side effects. Renders a generic approval card built from the supplied
 * title/summary/fields, and on approval returns an echo confirming what was
 * approved. Used by the guardian to verify card render, polling, resume, and
 * async agent continuation end-to-end without needing a real sensitive write.
 */

export interface ApprovalDemoField {
  label: string;
  value: string;
}

export interface RequestApprovalDemoInput {
  /** Short title shown at the top of the approval card. */
  title: string;
  /** One-paragraph description of what would happen if approved. */
  summary: string;
  /** Optional key/value rows rendered under the summary. */
  fields?: ApprovalDemoField[];
}

export interface RequestApprovalDemoOutput {
  approvedTitle: string;
  message: string;
}

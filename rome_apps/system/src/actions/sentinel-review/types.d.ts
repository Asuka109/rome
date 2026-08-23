/**
 * sentinel_review — Review unreviewed sentinel log entries.
 *
 * Event-only action (no inputSchema). Triggered by a recurring schedule
 * routine that Rome registers at boot via the `create_routine` action (see
 * packages/core/src/index.ts) — never called directly. Fetches sentinel log
 * entries that haven't been reviewed yet, sends a summary to the main agent
 * for review, and marks them as reviewed.
 */

export type SentinelReviewInput = Record<string, never>;

export interface SentinelReviewOutput {
  /** Number of sentinel log entries that were reviewed. */
  reviewed: number;
}

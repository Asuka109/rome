/**
 * add_person_mapping — Register a new person with a channel mapping.
 *
 * Agent-callable action. Creates a person record with a channel mapping
 * (e.g. Telegram user ID). The mapping is created in an unapproved state
 * and requires guardian approval before it becomes active.
 *
 * @example
 * await callAction("add_person_mapping", {
 *   displayName: "Alice",
 *   channel: "telegram",
 *   channelUserId: "987654",
 *   bondLevel: "inner-circle",
 * });
 */

export interface AddPersonMappingOutput {
  /** ID of the created person record. */
  personId: string;
  /** ID of the approval request awaiting guardian review. */
  approvalId: string;
}

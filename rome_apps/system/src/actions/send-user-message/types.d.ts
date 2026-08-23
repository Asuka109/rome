export interface SendUserMessageOutput {
  /** Webchat session the message landed in (created or existing). */
  sessionId: string;
  /** Turn allocated for the message; the agent's reply streams and persists under it. */
  turnId: string;
  /** True when the action created the session because no `sessionId` was given. */
  createdSession: boolean;
}

export const SESSION_HANDOFF_KEY_PREFIX = "sessionHandoff:";

export interface SessionHandoffRecord {
  userId: string;
  targetHost: string;
}

export function createSessionHandoffKey(nonce: string): string {
  return `${SESSION_HANDOFF_KEY_PREFIX}${nonce}`;
}

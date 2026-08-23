export function turnApiPath(
  sessionId: string,
  turnId: string,
  suffix: "trace.json" | "feedback" | "forks",
): string {
  return `/api/chat/sessions/${encodeURIComponent(sessionId)}/turns/${encodeURIComponent(
    turnId,
  )}/${suffix}`;
}

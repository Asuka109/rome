/** Per-turn terminals — result or error — produced by an agent. Works
 *  generically over `AgentMessage`, `StreamAgentMessage`, and
 *  `TraceBlockDto`, all of which discriminate on `type`. */
export function isTerminalBlock<T extends { type: string }>(
  m: T,
): m is T & { type: "result" | "error" } {
  return m.type === "result" || m.type === "error";
}

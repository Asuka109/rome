import type { TraceSnapshot } from "../../trace/types.js";

// Derive the chat-page surfaces (prompt bubble + final assistant message) from a
// frozen trace snapshot. A showcase trace is one turn; everything needed to
// reproduce the conversation column lives in its blocks.

// The runtime prepends a `<thread_context>…</thread_context>` block (prior
// conversation, guardian profile, etc.) to the guardian's message before it
// reaches the model, and that whole envelope is captured in the trace. The
// replay should show what the guardian actually typed, so strip the injected
// context wherever a user prompt is surfaced.
export function stripThreadContext(text: string): string {
  return text.replace(/<thread_context>[\s\S]*?<\/thread_context>/gi, "").trim();
}

export function deriveUserPrompt(
  snapshot: TraceSnapshot,
  metadata: Record<string, unknown>,
): string | null {
  const fromMeta = metadata.userPrompt;
  if (typeof fromMeta === "string" && fromMeta.trim()) return stripThreadContext(fromMeta) || null;
  for (const seg of snapshot.segments) {
    if (seg.kind === "block" && seg.block.type === "session_init" && seg.block.userPrompt) {
      return stripThreadContext(seg.block.userPrompt) || null;
    }
  }
  return null;
}

export function deriveFinalMessage(snapshot: TraceSnapshot): string | null {
  // Trailing assistant text: walk segments from the end, skipping terminal
  // result/error blocks, and collect consecutive text blocks until a non-text
  // segment (a tool run or thinking) is reached.
  const texts: string[] = [];
  for (let i = snapshot.segments.length - 1; i >= 0; i -= 1) {
    const seg = snapshot.segments[i];
    if (seg.kind !== "block") break;
    const block = seg.block;
    if (block.type === "result" || block.type === "error") continue;
    if (block.type === "text" && block.content.trim()) {
      texts.unshift(block.content);
      continue;
    }
    break;
  }
  return texts.length > 0 ? texts.join("\n\n") : null;
}

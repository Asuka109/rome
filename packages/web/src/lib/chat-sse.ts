export interface SSEEvent {
  event: string;
  data: string;
}

export function parseSSEEvents(text: string): SSEEvent[] {
  const events: SSEEvent[] = [];
  const parts = text.split("\n\n");
  for (const part of parts) {
    if (!part.trim()) continue;
    let event = "message";
    // Per the WHATWG EventSource spec, multiple `data:` lines in a single
    // event must be joined with `\n`. Earlier this method replaced instead
    // of appending, which silently truncated multi-line payloads.
    const dataLines: string[] = [];
    for (const line of part.split("\n")) {
      if (line.startsWith("event: ")) event = line.slice(7);
      else if (line.startsWith("data: ")) dataLines.push(line.slice(6));
    }
    const data = dataLines.join("\n");
    if (data) events.push({ event, data });
  }
  return events;
}

// VENDORED VERBATIM from rome-internal:
//   packages/web/src/lib/trace-format.ts
// No import seams required (no external imports). The body below is unchanged.
export function normalizeTracePayload(value: unknown): unknown {
  if (typeof value !== "string") {
    return value;
  }

  const parsed = tryParseJson(value);
  if (parsed && typeof parsed === "object") {
    return parsed;
  }

  return value;
}

export function formatTracePrimitive(value: unknown): string {
  if (typeof value === "undefined") return "(no output)";
  if (value === null) return "null";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") {
    return String(value);
  }

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function tryParseJson(value: string): unknown | null {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

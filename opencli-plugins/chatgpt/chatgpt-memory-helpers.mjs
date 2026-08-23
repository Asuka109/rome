export function cleanText(value) {
  return typeof value === "string"
    ? value
        .replace(/[\u00a0\u202f]/g, " ")
        .replace(/\s+/g, " ")
        .trim()
    : "";
}

export function unwrapEvaluateResult(payload) {
  if (
    payload &&
    !Array.isArray(payload) &&
    typeof payload === "object" &&
    "session" in payload &&
    "data" in payload
  ) {
    return payload.data;
  }
  return payload;
}

function titleFromId(id, index) {
  const title = cleanText(id)
    .split(/[-_]+/)
    .filter(Boolean)
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(" ");
  return title || `Section ${index + 1}`;
}

export function normalizeMemorySummaryPayload(payload) {
  const value = unwrapEvaluateResult(payload);
  if (!value || Array.isArray(value) || typeof value !== "object") {
    throw new Error("ChatGPT memory returned a malformed extraction payload");
  }

  if (!Array.isArray(value.sections)) {
    throw new Error("ChatGPT memory returned malformed summary sections");
  }

  const updated = cleanText(value.updated) || null;
  const seen = new Set();
  const rows = [];

  for (const section of value.sections) {
    if (!section || Array.isArray(section) || typeof section !== "object") continue;
    const text = cleanText(section.text);
    if (!text) continue;
    const id = cleanText(section.id);
    const title = cleanText(section.title) || titleFromId(id, rows.length);
    const identity = `${id.toLowerCase()}\n${title.toLowerCase()}\n${text}`;
    if (seen.has(identity)) continue;
    seen.add(identity);
    rows.push({
      Index: rows.length + 1,
      Section: title,
      Text: text,
      Updated: updated,
    });
  }

  return rows;
}

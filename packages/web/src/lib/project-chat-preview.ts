const DEFAULT_CHAT_PREVIEW_LENGTH = 180;

function normalizePreviewText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function excerptAroundMatch(
  text: string,
  matchIndex: number,
  matchLength: number,
  maxLength: number,
) {
  if (text.length <= maxLength) return text;

  const contextLength = Math.max(0, maxLength - matchLength);
  let start = Math.max(0, matchIndex - Math.floor(contextLength / 2));
  let end = Math.min(text.length, start + maxLength);
  start = Math.max(0, end - maxLength);
  end = Math.min(text.length, start + maxLength);

  const prefix = start > 0 ? "..." : "";
  const suffix = end < text.length ? "..." : "";
  return `${prefix}${text.slice(start, end)}${suffix}`;
}

export function buildProjectChatPreview({
  maxLength = DEFAULT_CHAT_PREVIEW_LENGTH,
  query,
  searchText,
  snippet,
}: {
  maxLength?: number;
  query: string;
  searchText: string;
  snippet: string;
}): string {
  const normalizedSnippet = normalizePreviewText(snippet);
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return normalizedSnippet;

  const normalizedSearchText = normalizePreviewText(searchText);
  const matchIndex = normalizedSearchText.toLowerCase().indexOf(normalizedQuery);
  if (matchIndex === -1) return normalizedSnippet;

  return excerptAroundMatch(normalizedSearchText, matchIndex, normalizedQuery.length, maxLength);
}

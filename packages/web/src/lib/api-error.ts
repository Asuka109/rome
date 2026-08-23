/**
 * A user-facing message for a failed response.
 *
 * Only the server's structured fields are used. A body carrying none of them
 * was not written for a human — a 500 answering with an HTML error page or a
 * stack trace must never be rendered verbatim — so the caller's `fallback`
 * stands in.
 *
 * This used to end with a `response.text()` fallback, which was unreachable:
 * `response.json()` consumes the body even when parsing fails, so the read that
 * followed it always threw and returned `fallback` anyway.
 */
export async function getApiErrorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const data = await response.json();
    if (typeof data?.detail === "string" && data.detail.trim()) return data.detail.trim();
    if (typeof data?.message === "string" && data.message.trim()) return data.message.trim();
    if (typeof data?.error === "string" && data.error.trim()) return data.error.trim();
  } catch {
    // Ignore JSON parse failures and use the caller's fallback.
  }

  return fallback;
}

/** IANA timezone parsing/validation. Single home for what was duplicated across
 * the settings route, the projects dashboard, the model provider, and the
 * routine scheduler. */

/** Whether `tz` is an IANA zone the runtime can actually resolve. */
export function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz }).format(new Date(0));
    return true;
  } catch {
    return false;
  }
}

/** Parse a stored or user-supplied value into a validated IANA timezone string,
 * or `null` when it isn't usable — not a string, blank, or not a real zone.
 * Trims surrounding whitespace before validating. */
export function parseTimeZone(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const tz = value.trim();
  if (!tz) return null;
  return isValidTimeZone(tz) ? tz : null;
}

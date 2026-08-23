const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function parseEmailTextarea(value: string): { emails: string[]; invalid: string[] } {
  const tokens = value
    .split(/[\s,;]+/)
    .map((token) => token.trim().toLowerCase())
    .filter(Boolean);
  const emails: string[] = [];
  const invalid: string[] = [];
  const seen = new Set<string>();

  for (const token of tokens) {
    if (!EMAIL_RE.test(token)) {
      invalid.push(token);
      continue;
    }
    if (!seen.has(token)) {
      seen.add(token);
      emails.push(token);
    }
  }

  return { emails: emails.sort(), invalid };
}

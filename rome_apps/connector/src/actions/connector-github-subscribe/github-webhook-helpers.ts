export function unionGithubEvents(existing: string[] | undefined, requested: string[]): string[] {
  if (existing?.includes("*") || requested.includes("*")) return ["*"];
  const out: string[] = [];
  for (const event of [...(existing ?? []), ...requested]) {
    if (!out.includes(event)) out.push(event);
  }
  return out;
}

export function isNonRetryableUpdateFailure(err: unknown): boolean {
  const status =
    typeof err === "object" && err !== null ? (err as { status?: unknown }).status : null;
  return status === 404 || status === 410 || status === 422;
}

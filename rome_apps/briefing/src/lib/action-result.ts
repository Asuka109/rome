import type { ActionResult } from "@rome-os/app-runtime";

export interface Unwrapped {
  ok: boolean;
  data: unknown;
  error: string;
}

/** Narrow an ActionResult to a simple { ok, data, error } shape. */
export function unwrap(result: ActionResult): Unwrapped {
  if (result.status === "ok") {
    return { ok: true, data: result.data, error: "" };
  }
  if (result.status === "error") {
    return { ok: false, data: undefined, error: result.error };
  }
  return { ok: false, data: undefined, error: `action returned ${result.status}` };
}

/** Pull the prose text out of a `summon` result's data payload. */
export function summonText(data: unknown): string {
  if (
    data &&
    typeof data === "object" &&
    typeof (data as { result?: unknown }).result === "string"
  ) {
    return ((data as { result: string }).result || "").trim();
  }
  return "";
}

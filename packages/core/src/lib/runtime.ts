import { existsSync } from "node:fs";

export function runningInsideDocker(): boolean {
  return existsSync("/.dockerenv");
}

/**
 * The instance slug — the stable, DNS-label-safe identifier for this instance.
 * Sourced from `PANTHEON_SLUG`, the single slug env var: in prod it's the
 * Rome-Cloud-injected tenant slug, in dev the local Rome Cloud tenant (`dev`). Also
 * serves as telemetry's `service.instance.id`.
 *
 * Returns `undefined` when unset or blank so callers can distinguish "this
 * instance has no slug" from a real value — important for rollout gating, where
 * collapsing every un-slugged instance into one shared bucket would make them
 * all flip together.
 */
export function resolveInstanceSlug(env: NodeJS.ProcessEnv = process.env): string | undefined {
  const slug = env.PANTHEON_SLUG?.trim();
  return slug ? slug : undefined;
}

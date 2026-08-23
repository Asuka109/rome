import { Hono } from "hono";
import type { ApiDeps } from "../deps.js";
import {
  ANTHROPIC_COMPATIBLE_CREDENTIALS_SETTING,
  redactAnthropicCompatibleCredentialsSetting,
} from "../../lib/anthropic-compatible-providers.js";
import { RELAY_SETTING_KEY, redactRelaySetting } from "../../relay/settings.js";
import {
  GUARDIAN_TIMEZONE_SETTING_KEY,
  applyGuardianTimezoneWrite,
} from "../../routines/guardian-timezone.js";

function redactSettingsForResponse(settings: Record<string, unknown>): Record<string, unknown> {
  const redacted = { ...settings };
  if (ANTHROPIC_COMPATIBLE_CREDENTIALS_SETTING in redacted) {
    redacted[ANTHROPIC_COMPATIBLE_CREDENTIALS_SETTING] =
      redactAnthropicCompatibleCredentialsSetting(
        redacted[ANTHROPIC_COMPATIBLE_CREDENTIALS_SETTING],
      );
  }
  if (RELAY_SETTING_KEY in redacted) {
    redacted[RELAY_SETTING_KEY] = redactRelaySetting(redacted[RELAY_SETTING_KEY]);
  }
  return redacted;
}

export function settingsRoutes(deps: ApiDeps): Hono {
  const app = new Hono();

  app.get("/settings", async (c) => {
    const result = await deps.settingsRepo.getAll();
    return c.json(redactSettingsForResponse(result));
  });

  app.put("/settings", async (c) => {
    const body = await c.req
      .json<Record<string, unknown>>()
      .catch(() => ({}) as Record<string, unknown>);

    // guardianTimezone is scheduler input: route it through the shared
    // write helper (validate + persist/clear + reschedule floating routines) so
    // this and onboarding stay in sync. A non-empty invalid value is rejected.
    if (GUARDIAN_TIMEZONE_SETTING_KEY in body) {
      const result = await applyGuardianTimezoneWrite(body[GUARDIAN_TIMEZONE_SETTING_KEY], {
        settingsRepo: deps.settingsRepo,
        reactivateFloating: () => deps.routineEngine.reactivateFloating(),
      });
      if (result.status === "invalid") {
        return c.json({ error: result.error }, 400);
      }
      // The helper owns the persist/clear for this key; don't double-write it.
      delete body[GUARDIAN_TIMEZONE_SETTING_KEY];
    }

    for (const [key, value] of Object.entries(body)) {
      await deps.settingsRepo.set(key, value);
    }

    return c.json({ ok: true });
  });

  return app;
}

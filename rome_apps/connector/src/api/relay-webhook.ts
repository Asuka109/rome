import type { AppSettingsRepository } from "@rome-os/app-runtime";

type RelaySetting = {
  depositUrl?: unknown;
};

/**
 * Resolve the public relay mailbox address upstream webhook providers post to.
 * Core owns provisioning this setting; connector consumers only ever read the
 * deposit face, never derive an instance URL or configure a second transport.
 */
export async function resolveRelayDepositUrl(
  settings: Pick<AppSettingsRepository, "get">,
): Promise<string | null> {
  const relay = await settings.get<RelaySetting>("relay");
  return typeof relay?.depositUrl === "string" && relay.depositUrl.length > 0
    ? relay.depositUrl
    : null;
}

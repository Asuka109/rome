import { useCallback } from "react";
import { saveSetting } from "@/lib/chat-api";
import { useApps } from "@/hooks/use-apps";
import { useInvalidateSettings, useSettings } from "@/hooks/use-settings";

// Persisted ledger of app ids the user has already been shown. It is the
// *acknowledgement* axis, deliberately separate from `sidebarPins` (the order
// axis): pins answer "what's in my sidebar and in what order", while this
// answers "have I been told this app exists yet". Keeping them apart is what
// lets a brand-new first-party app surface a "new" hint without the system
// confusing "never seen" with "deliberately removed from the sidebar".
const SEEN_APPS_KEY = "seenAppIds";

function parseSeenAppIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((id): id is string => typeof id === "string");
}

// Only apps with a usable frontend can ever appear in the sidebar, so only
// those can be "new" there. A backend-only app installing doesn't earn a hint.
function frontendAppIdsOf(apps: ReturnType<typeof useApps>["apps"]): string[] {
  return (apps ?? []).filter((a) => a.hasFrontend && a.href).map((a) => a.id);
}

export interface NewAppsResult {
  /** App ids the user has not yet acknowledged (installed, has a frontend). */
  newAppIds: Set<string>;
  /** Persist every currently-installed frontend app as acknowledged. No-ops
   *  when there's nothing new, so it's safe to call unconditionally on mount. */
  markAppsSeen: () => void;
}

export function useNewApps(): NewAppsResult {
  const { data: settings } = useSettings();
  const { apps } = useApps();
  const invalidateSettings = useInvalidateSettings();

  // Until settings actually resolves we can't tell "unseen" from "not loaded
  // yet": an unresolved query reads as `undefined`, which would parse to an
  // empty ledger. Treating that as empty both flashes a false hint and, worse,
  // lets markAppsSeen() persist a truncated ledger — dropping previously
  // acknowledged (now-uninstalled) ids, so a later reinstall looks "new" again.
  // Settings read failures keep `settings` undefined, so `!== undefined` is a
  // reliable "loaded" signal.
  const settingsLoaded = settings !== undefined;
  const seen = parseSeenAppIds(settings?.[SEEN_APPS_KEY]);
  const newAppIds = settingsLoaded
    ? new Set(frontendAppIdsOf(apps).filter((id) => !seen.includes(id)))
    : new Set<string>();

  const markAppsSeen = useCallback(() => {
    if (settings === undefined) return; // never write against an unknown ledger
    const current = parseSeenAppIds(settings[SEEN_APPS_KEY]);
    const unseen = frontendAppIdsOf(apps).filter((id) => !current.includes(id));
    if (unseen.length === 0) return;
    void saveSetting(SEEN_APPS_KEY, [...current, ...unseen]).then(() => invalidateSettings());
  }, [apps, settings, invalidateSettings]);

  return { newAppIds, markAppsSeen };
}

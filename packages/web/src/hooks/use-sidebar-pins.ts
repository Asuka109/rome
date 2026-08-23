import { useCallback, useEffect, useState } from "react";
import { saveSetting } from "@/lib/chat-api";
import { useInvalidateSettings, useSettings } from "@/hooks/use-settings";
import {
  DEFAULT_SIDEBAR_PINS,
  STORAGE_KEY as SIDEBAR_PINS_KEY,
  normalizeSidebarPins,
  type PinnedEntry,
} from "@/shell/AppGrid";

export interface SidebarPins {
  pins: PinnedEntry[];
  isPinned: (type: PinnedEntry["type"], id: string) => boolean;
  togglePin: (type: PinnedEntry["type"], id: string) => void;
}

// The sidebar pin set, shared by every surface that offers Pin/Unpin (the apps
// grid and the embedded-app actions widget). localStorage answers first render,
// the settings query then reconciles against server truth, and a toggle writes
// both plus the `rome-pins-changed` poke the sidebar listens for.
export function useSidebarPins(): SidebarPins {
  const [pins, setPinsLocal] = useState<PinnedEntry[]>(() => {
    try {
      const stored = localStorage.getItem(SIDEBAR_PINS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return normalizeSidebarPins(parsed);
      }
    } catch {}
    return normalizeSidebarPins(DEFAULT_SIDEBAR_PINS);
  });

  const { data: settings } = useSettings();
  const invalidateSettings = useInvalidateSettings();
  useEffect(() => {
    if (settings && Array.isArray(settings.sidebarPins)) {
      setPinsLocal(normalizeSidebarPins(settings.sidebarPins as PinnedEntry[]));
    }
  }, [settings]);

  const togglePin = useCallback(
    (type: PinnedEntry["type"], id: string) => {
      setPinsLocal((current) => {
        const isPinned = current.some((p) => p.type === type && p.id === id);
        const next = normalizeSidebarPins(
          isPinned
            ? current.filter((p) => !(p.type === type && p.id === id))
            : [...current, { type, id }],
        );
        try {
          localStorage.setItem(SIDEBAR_PINS_KEY, JSON.stringify(next));
        } catch {}
        void saveSetting("sidebarPins", next).then(() => invalidateSettings());
        window.dispatchEvent(new Event("rome-pins-changed"));
        return next;
      });
    },
    [invalidateSettings],
  );

  const isPinned = useCallback(
    (type: PinnedEntry["type"], id: string) => pins.some((p) => p.type === type && p.id === id),
    [pins],
  );

  return { pins, isPinned, togglePin };
}

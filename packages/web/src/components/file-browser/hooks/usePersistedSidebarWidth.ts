import { useEffect } from "react";
import { useFileBrowserStoreApi } from "../store/context";
import { clampSidebarWidth } from "../store/utils";

export function usePersistedSidebarWidth(logicalRootPath: string) {
  const store = useFileBrowserStoreApi();
  const sidebarStorageKey = `rome:file-browser:${logicalRootPath}:sidebar-width`;

  useEffect(() => {
    try {
      const storedWidth = window.localStorage.getItem(sidebarStorageKey);
      if (!storedWidth) return;
      const parsedWidth = Number(storedWidth);
      if (Number.isFinite(parsedWidth)) {
        store.setState((state) => ({
          ui: { ...state.ui, sidebarWidth: clampSidebarWidth(parsedWidth) },
        }));
      }
    } catch {
      // Width persistence is a convenience only.
    }
  }, [sidebarStorageKey, store]);

  return sidebarStorageKey;
}

import { useEffect } from "react";
import { useFileBrowserStore, useFileBrowserStoreApi } from "../store/context";
import { DEFAULT_SIDEBAR_WIDTH, clampSidebarWidth } from "../store/utils";

export function useSidebarResize(sidebarStorageKey: string) {
  const store = useFileBrowserStoreApi();
  const isResizingSidebar = useFileBrowserStore((s) => s.ui.isResizingSidebar);

  useEffect(() => {
    if (!isResizingSidebar) return;

    const previousCursor = document.body.style.cursor;
    const previousUserSelect = document.body.style.userSelect;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const getNextWidth = (clientX: number) => {
      const resizeState = store.getState().refs.sidebarResize;
      if (!resizeState) return DEFAULT_SIDEBAR_WIDTH;
      return clampSidebarWidth(resizeState.startWidth + clientX - resizeState.startX);
    };

    const handlePointerMove = (event: PointerEvent) => {
      store.setState((s) => ({ ui: { ...s.ui, sidebarWidth: getNextWidth(event.clientX) } }));
    };

    const finishResize = (event: PointerEvent) => {
      const nextWidth = getNextWidth(event.clientX);
      store.setState((s) => ({
        ui: { ...s.ui, sidebarWidth: nextWidth, isResizingSidebar: false },
      }));
      store.getState().refs.sidebarResize = null;
      try {
        window.localStorage.setItem(sidebarStorageKey, String(nextWidth));
      } catch {
        // Width persistence is a convenience only.
      }
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", finishResize);
    window.addEventListener("pointercancel", finishResize);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", finishResize);
      window.removeEventListener("pointercancel", finishResize);
      document.body.style.cursor = previousCursor;
      document.body.style.userSelect = previousUserSelect;
    };
  }, [isResizingSidebar, sidebarStorageKey, store]);
}

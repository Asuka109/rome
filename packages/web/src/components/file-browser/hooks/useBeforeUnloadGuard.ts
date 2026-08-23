import { useEffect } from "react";
import { useFileBrowserStoreApi } from "../store/context";

export function useBeforeUnloadGuard() {
  const store = useFileBrowserStoreApi();
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      const file = store.getState().file;
      if (file._suppressNextBeforeUnload) {
        file._suppressNextBeforeUnload = false;
        return;
      }
      if (file._manualSaveInFlight) {
        event.preventDefault();
        event.returnValue = "";
        return;
      }
      if (!store.getState().file.hasUnsavedEdits()) return;
      if (file._autoSaveCanRecover) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [store]);
}

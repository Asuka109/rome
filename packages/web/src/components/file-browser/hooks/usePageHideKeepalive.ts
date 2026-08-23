import { useEffect } from "react";
import { useFileBrowserStoreApi } from "../store/context";
import { createFileSaveRequestBody } from "@/lib/file-autosave-keepalive";

/**
 * Best-effort save on `pagehide`. Uses `fetch keepalive: true` so the request
 * survives tab/window teardown — but only for payloads small enough to fit;
 * the file slice's `_autoSaveCanRecover` flag tracks that and gates
 * `beforeunload`.
 */
export function usePageHideKeepalive() {
  const store = useFileBrowserStoreApi();

  useEffect(() => {
    const config = store.getState().config;
    if (!config.autoSave) return;

    const handlePageHide = () => {
      const state = store.getState();
      const file = state.file.selectedFile;
      const path = state.selection.selectedPath;
      const contentToSave = state.file.content;
      if (!file || !path || !file.editable || contentToSave === state.file.lastDiskContent) {
        return;
      }
      const policy = state.file.resolveAutoSavePolicy(file);
      if (!policy) return;
      try {
        void fetch(`${config.apiBasePath}/file`, {
          body: createFileSaveRequestBody({
            commit: policy.commit ?? false,
            content: contentToSave,
            path,
          }),
          headers: { "Content-Type": "application/json" },
          keepalive: true,
          method: "PUT",
        });
      } catch {
        // Page teardown saves are best-effort.
      }
    };

    window.addEventListener("pagehide", handlePageHide);
    return () => window.removeEventListener("pagehide", handlePageHide);
  }, [store]);
}

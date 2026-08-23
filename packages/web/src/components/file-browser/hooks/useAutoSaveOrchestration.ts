import { useEffect, useMemo } from "react";
import { useFileBrowserStore, useFileBrowserStoreApi } from "../store/context";
import { fitsKeepaliveFileSavePayload } from "@/lib/file-autosave-keepalive";
import { DEFAULT_AUTOSAVE_DELAY_MS } from "../store/utils";

/**
 * Reactive autosave: arms a delayed write when the content buffer diverges
 * from disk. Mirrors the original effect at file-browser-page.tsx:1492-1573 —
 * same abort + request-id pairing.
 *
 * Subtle: we deliberately do **not** subscribe to `lastDiskContent`. Reading
 * it via `getState()` inside the effect avoids a race where writeFileContent's
 * `set({ lastDiskContent })` re-renders the component between the write's
 * resolution and our `.then()` callback, which would let the cleanup increment
 * `_autoSaveRequestId` first and make the .then() bail before transitioning
 * autoSaveState to "saved".
 */
export function useAutoSaveOrchestration() {
  const store = useFileBrowserStoreApi();
  const content = useFileBrowserStore((s) => s.file.content);
  const selectedFile = useFileBrowserStore((s) => s.file.selectedFile);
  const selectedPath = useFileBrowserStore((s) => s.selection.selectedPath);
  const autoSaveState = useFileBrowserStore((s) => s.file.autoSaveState);
  const saving = useFileBrowserStore((s) => s.file.saving);

  // Memoize policy on selectedFile identity so the arming effect's deps stay
  // stable across re-renders.
  const policy = useMemo(
    () =>
      selectedFile?.editable ? store.getState().file.resolveAutoSavePolicy(selectedFile) : null,
    [selectedFile, store],
  );

  // Update _autoSaveCanRecover: pending bytes still need a pagehide keepalive
  // flush to reach disk. Reads lastDiskContent on every (content) change.
  useEffect(() => {
    const fileSlice = store.getState().file;
    const lastDiskContent = fileSlice.lastDiskContent;
    if (!policy || autoSaveState === "error") {
      fileSlice._autoSaveCanRecover = false;
      return;
    }
    if (content === lastDiskContent) {
      fileSlice._autoSaveCanRecover = true;
      return;
    }
    fileSlice._autoSaveCanRecover = fitsKeepaliveFileSavePayload({
      commit: policy.commit ?? false,
      content,
      path: selectedPath,
    });
  }, [autoSaveState, content, policy, selectedPath, store]);

  // Arm / abort the delayed write.
  useEffect(() => {
    if (!policy || !selectedPath || !selectedFile?.editable || saving) {
      return;
    }
    if (content === store.getState().file.lastDiskContent) {
      return;
    }

    const requestId = store.getState().file._autoSaveRequestId + 1;
    store.getState().file._autoSaveRequestId = requestId;
    const controller = new AbortController();
    const contentToSave = content;
    const path = selectedPath;

    store.setState((s) => ({ file: { ...s.file, autoSaveState: "pending" } }));
    const timeoutId = window.setTimeout(() => {
      if (store.getState().file._autoSaveTimeoutId === timeoutId) {
        store.getState().file._autoSaveTimeoutId = null;
      }
      store.setState((s) => ({ file: { ...s.file, autoSaveState: "saving" } }));
      void store
        .getState()
        .file.writeFileContent({
          commit: policy.commit ?? false,
          contentToSave,
          path,
          signal: controller.signal,
        })
        .then((result) => {
          const currentFile = store.getState().file;
          if (currentFile._autoSaveAbortController === controller) {
            currentFile._autoSaveAbortController = null;
          }
          if (
            currentFile._autoSaveRequestId !== requestId ||
            store.getState().selection.selectedPath !== path
          ) {
            return;
          }
          if (result.success) {
            store.setState((s) => ({ file: { ...s.file, autoSaveState: "saved" } }));
          } else if (!result.aborted) {
            store.setState((s) => ({ file: { ...s.file, autoSaveState: "error" } }));
          }
        });
    }, policy.delayMs ?? DEFAULT_AUTOSAVE_DELAY_MS);
    store.getState().file._autoSaveTimeoutId = timeoutId;
    store.getState().file._autoSaveAbortController = controller;

    return () => {
      const current = store.getState().file;
      if (current._autoSaveTimeoutId === timeoutId) {
        window.clearTimeout(timeoutId);
        current._autoSaveTimeoutId = null;
      }
      if (current._autoSaveAbortController === controller) {
        controller.abort();
        current._autoSaveAbortController = null;
      }
      current._autoSaveRequestId += 1;
    };
  }, [content, policy, saving, selectedFile?.editable, selectedPath, store]);
}

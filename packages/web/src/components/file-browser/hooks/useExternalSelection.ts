import { useEffect } from "react";
import { useFileBrowserStoreApi } from "../store/context";
import type { ExternalSelection } from "../store/types";

/**
 * For embedders that push selection externally (e.g. workspace ProjectsWidget
 * following the file or folder the agent linked in chat). One entry point for
 * both selection kinds; the embedder says which one it resolved.
 */
export function useExternalSelection(selection: ExternalSelection | null | undefined) {
  const store = useFileBrowserStoreApi();
  const path = selection?.path ?? null;
  const type = selection?.type ?? null;

  useEffect(() => {
    if (!path || !type) return;
    const current = store.getState().selection;
    if (path === (type === "file" ? current.selectedPath : current.selectedFolderPath)) return;

    if (type === "file") {
      store.getState().tree.expandAncestors(path);
      // guardedSelectFile, not raw loadFile, so an in-flight unsaved edit
      // surfaces the confirm dialog before being replaced.
      void store.getState().selection.guardedSelectFile(path, { syncUrl: false });
      return;
    }

    let cancelled = false;
    void (async () => {
      // The pushed folder can sit deeper than the tree has loaded (initial
      // load is two levels); materialize the ancestor chain first so the
      // selection is actually visible, mirroring useUrlSelectionSync.
      await store.getState().tree.loadDirectoryAncestors(path);
      if (cancelled) return;
      // guardedSelectFolder, like the file branch: an in-flight unsaved edit
      // must confirm before the selection clears the editor.
      await store.getState().selection.guardedSelectFolder(path, { expand: true, syncUrl: false });
    })();
    return () => {
      cancelled = true;
    };
  }, [path, type, store]);
}

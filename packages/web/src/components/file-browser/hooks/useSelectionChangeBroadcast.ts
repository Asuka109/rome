import { useEffect, useRef } from "react";
import { useFileBrowserStore } from "../store/context";

type Callback = (selection: { selectedPath: string | null; selectedTreePaths: string[] }) => void;

/**
 * Surface selection upward for embedders that mirror selection elsewhere
 * (the workspace ProjectsWidget). The browser is the source of truth; this
 * just fires the prop callback when selection changes.
 */
export function useSelectionChangeBroadcast(onSelectionChange?: Callback) {
  const selectedPath = useFileBrowserStore((s) => s.selection.selectedPath);
  const selectedTreePaths = useFileBrowserStore((s) => s.selection.selectedTreePaths);
  const callbackRef = useRef(onSelectionChange);
  useEffect(() => {
    callbackRef.current = onSelectionChange;
  }, [onSelectionChange]);
  useEffect(() => {
    callbackRef.current?.({ selectedPath, selectedTreePaths });
  }, [selectedPath, selectedTreePaths]);
}

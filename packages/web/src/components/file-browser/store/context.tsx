import { createContext, useContext, useEffect, useRef, type ReactNode } from "react";
import { useStore } from "zustand";
import type { FileBrowserConfig, FileBrowserState } from "./types";
import { createFileBrowserStore, type FileBrowserStoreApi } from "./create";

const FileBrowserStoreContext = createContext<FileBrowserStoreApi | null>(null);

export function FileBrowserStoreProvider({
  config,
  children,
}: {
  config: FileBrowserConfig;
  children: ReactNode;
}) {
  // One store per mount. The factory runs once; subsequent renders keep the
  // same store. The provider is mounted from a stable parent (FileBrowserPage)
  // and unmounted only when the host page leaves — that lifecycle matches the
  // intent.
  const storeRef = useRef<FileBrowserStoreApi | null>(null);
  if (!storeRef.current) {
    storeRef.current = createFileBrowserStore(config);
  }
  // Keep navigate/route/t in sync without recreating the store, since
  // react-router's navigate identity churns on every render and i18n's
  // TFunction does too.
  useEffect(() => {
    storeRef.current!.setState((state) => ({ config: { ...state.config, ...config } }));
  }, [config]);

  return (
    <FileBrowserStoreContext.Provider value={storeRef.current}>
      {children}
    </FileBrowserStoreContext.Provider>
  );
}

export function useFileBrowserStoreApi(): FileBrowserStoreApi {
  const store = useContext(FileBrowserStoreContext);
  if (!store) throw new Error("useFileBrowserStoreApi requires FileBrowserStoreProvider");
  return store;
}

export function useFileBrowserStore<T>(selector: (state: FileBrowserState) => T): T {
  const store = useFileBrowserStoreApi();
  return useStore(store, selector);
}

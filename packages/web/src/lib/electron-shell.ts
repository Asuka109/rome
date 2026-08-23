declare global {
  interface Window {
    /** The desktop preload's IPC bridge. Absent in a browser. */
    rome?: unknown;
  }
}

/**
 * Whether this dashboard is being served inside the Mac app's Electron window.
 *
 * Reads the preload's bridge rather than the `is-electron` class that
 * `globals.css` keys off, because the two arrive at different times. The class
 * is added on `DOMContentLoaded`, and Rsbuild emits module scripts, which are
 * also deferred — so a render can precede it. `contextBridge.exposeInMainWorld`
 * runs synchronously before any page script, so this cannot be sampled too
 * early.
 *
 * That distinction only matters where being wrong is expensive. Styling can
 * afford to arrive a frame late; a gate that decides whether to render a
 * control acting on another machine cannot, because it fails open and nothing
 * re-renders when the class appears.
 *
 * Pure-web builds have no preload, so this is `false` there.
 */
export function isElectronShell(): boolean {
  return typeof window !== "undefined" && window.rome !== undefined;
}

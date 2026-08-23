import { useSyncExternalStore } from "react";

/**
 * Tailwind's `md` breakpoint as a media query. The shell flips the sidebar
 * from a mobile slide-over to an in-flow column at exactly this width, so JS
 * that varies sidebar behavior has to agree with the stylesheet on where
 * that flip happens.
 */
const DESKTOP_QUERY = "(min-width: 48rem)";

function matchMediaAvailable(): boolean {
  return typeof window !== "undefined" && typeof window.matchMedia === "function";
}

function subscribe(onStoreChange: () => void): () => void {
  if (!matchMediaAvailable()) return () => {};
  const mql = window.matchMedia(DESKTOP_QUERY);
  mql.addEventListener("change", onStoreChange);
  return () => mql.removeEventListener("change", onStoreChange);
}

function getSnapshot(): boolean {
  if (!matchMediaAvailable()) return false;
  return window.matchMedia(DESKTOP_QUERY).matches;
}

/**
 * True from Tailwind `md` up — the widths where the sidebar renders as an
 * in-flow column rather than a slide-over. Live-updates on window resize.
 */
export function useDesktop(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}

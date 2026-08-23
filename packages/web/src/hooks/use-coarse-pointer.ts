import { useSyncExternalStore } from "react";

/**
 * Touch-first devices: no hover capability and a coarse primary pointer.
 * This is the same signal `globals.css` uses to scope mobile-only rules
 * (e.g. the iOS input font-size fix), so "coarse pointer" means the same
 * thing in CSS and in JS.
 *
 * A phone/tablet with an attached hardware keyboard still matches — that is
 * intentional: the media query tracks the device class, not the currently
 * focused input method.
 */
const COARSE_POINTER_QUERY = "(hover: none) and (pointer: coarse)";

function matchMediaAvailable(): boolean {
  return typeof window !== "undefined" && typeof window.matchMedia === "function";
}

function subscribe(onStoreChange: () => void): () => void {
  if (!matchMediaAvailable()) return () => {};
  const mql = window.matchMedia(COARSE_POINTER_QUERY);
  mql.addEventListener("change", onStoreChange);
  return () => mql.removeEventListener("change", onStoreChange);
}

function getSnapshot(): boolean {
  if (!matchMediaAvailable()) return false;
  return window.matchMedia(COARSE_POINTER_QUERY).matches;
}

/**
 * True on touch-first devices (phones, tablets), false on desktop.
 * Live-updates if the pointer capabilities change (e.g. responsive devtools,
 * convertible laptops switching modes).
 */
export function useCoarsePointer(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}

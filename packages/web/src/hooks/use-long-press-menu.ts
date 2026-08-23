import { useCallback, useEffect, useRef } from "react";
import type { MouseEvent, PointerEvent } from "react";

/**
 * Matches Radix's own context-menu long-press delay, so surfaces driven by this
 * hook and surfaces on `ContextMenuTrigger` (the file tree, whose rows are
 * draggable and so cannot use a pointer timer) open at the same moment.
 */
export const LONG_PRESS_MS = 700;
/** A finger that drifts further than this is scrolling, not pressing. */
export const LONG_PRESS_MOVE_TOLERANCE_PX = 10;

export interface LongPressMenu {
  /** Spread on the element the gesture is performed over. */
  triggerProps: {
    onPointerDown: (event: PointerEvent<HTMLElement>) => void;
    onPointerMove: (event: PointerEvent<HTMLElement>) => void;
    onPointerUp: () => void;
    onPointerCancel: () => void;
    onPointerLeave: () => void;
    onContextMenu: (event: MouseEvent<HTMLElement>) => void;
  };
  /**
   * `onClickCapture` for whatever the press would otherwise activate — the row
   * button, the tile's cover link.
   */
  suppressActivationClick: (event: MouseEvent<HTMLElement>) => void;
  /** Spread on Radix menu content so the release that opened it selects nothing. */
  menuContentProps: {
    onPointerUpCapture: (event: PointerEvent<HTMLElement>) => void;
  };
}

/**
 * Press-and-hold (touch/pen) or right-click (mouse) to open a menu — the shared
 * gesture behind the apps grid tiles and the compact file list.
 *
 * `canOpen` is read at the moment the menu would open rather than when the
 * press starts, so a tile that becomes busy mid-press doesn't open a menu for a
 * state it has already left.
 */
export function useLongPressMenu({
  canOpen,
  onOpen,
}: {
  canOpen: boolean;
  onOpen: () => void;
}): LongPressMenu {
  const canOpenRef = useRef(canOpen);
  canOpenRef.current = canOpen;
  const onOpenRef = useRef(onOpen);
  onOpenRef.current = onOpen;

  const timer = useRef<number | null>(null);
  const origin = useRef<{ x: number; y: number } | null>(null);
  const pointerType = useRef<string | null>(null);
  const openedThisPress = useRef(false);
  const suppressNextClick = useRef(false);
  const blockNextContentPointerUp = useRef(false);

  const cancelPress = useCallback(() => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
    origin.current = null;
  }, []);

  useEffect(() => cancelPress, [cancelPress]);

  // Opening under a pointer that is still down has two consequences to swallow,
  // exactly as a native context menu does: the release synthesizes a click on
  // whatever sits beneath the finger, and Radix menu items activate on
  // pointerup, so that same release would select the item the menu just mounted
  // under it.
  const open = (underPress: boolean) => {
    openedThisPress.current = true;
    if (underPress) {
      suppressNextClick.current = true;
      blockNextContentPointerUp.current = true;
    }
    onOpenRef.current();
  };

  return {
    triggerProps: {
      onPointerDown(event) {
        cancelPress();
        pointerType.current = event.pointerType;
        openedThisPress.current = false;
        suppressNextClick.current = false;
        blockNextContentPointerUp.current = false;
        // Mouse users get right-click; holding a mouse button down is not a
        // gesture anyone expects to open anything.
        if (event.pointerType === "mouse" || !canOpenRef.current) return;
        origin.current = { x: event.clientX, y: event.clientY };
        timer.current = window.setTimeout(() => {
          timer.current = null;
          origin.current = null;
          if (canOpenRef.current) open(true);
        }, LONG_PRESS_MS);
      },
      onPointerMove(event) {
        const start = origin.current;
        if (!start) return;
        const distance = Math.hypot(event.clientX - start.x, event.clientY - start.y);
        if (distance > LONG_PRESS_MOVE_TOLERANCE_PX) cancelPress();
      },
      // All three release paths must forget the pointer type, not just cancel
      // the timer: it answers "is a press still down?" for a later contextmenu,
      // and a stale non-mouse value there would swallow a mouse user's next
      // click.
      onPointerUp() {
        cancelPress();
        pointerType.current = null;
      },
      onPointerCancel() {
        cancelPress();
        pointerType.current = null;
      },
      onPointerLeave() {
        cancelPress();
        pointerType.current = null;
      },
      onContextMenu(event) {
        // Never show the browser's menu over these surfaces — ours replaces it.
        event.preventDefault();
        cancelPress();
        // Android fires contextmenu on long-press too, and its threshold is
        // shorter than ours, so this can arrive either side of the timer.
        if (openedThisPress.current || !canOpenRef.current) return;
        // `buttons !== 0` covers macOS, which fires contextmenu on mousedown.
        // Touch and pen fire it mid-press with no buttons set, so the pointer
        // type answers for them. What's left — Windows' post-release
        // contextmenu — has no release to guard.
        const stillPressed =
          event.buttons !== 0 || (pointerType.current !== null && pointerType.current !== "mouse");
        open(stillPressed);
      },
    },

    suppressActivationClick(event) {
      if (!suppressNextClick.current) return;
      suppressNextClick.current = false;
      event.preventDefault();
      event.stopPropagation();
    },

    menuContentProps: {
      onPointerUpCapture(event) {
        if (!blockNextContentPointerUp.current) return;
        blockNextContentPointerUp.current = false;
        event.preventDefault();
        event.stopPropagation();
      },
    },
  };
}

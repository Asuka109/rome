import { useEffect, useRef, type RefObject } from "react";

/**
 * Dismiss a popover on pointer down outside `ref` or on Escape.
 *
 * `onDismiss` is read through a live ref, so callers can pass an inline arrow
 * function without worrying about identity stability — the listener always
 * sees the most recent callback. The effect only rebinds when `open` flips.
 */
export function usePopoverDismiss(
  ref: RefObject<HTMLElement | null>,
  open: boolean,
  onDismiss: () => void,
): void {
  const onDismissRef = useRef(onDismiss);
  useEffect(() => {
    onDismissRef.current = onDismiss;
  }, [onDismiss]);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) {
        onDismissRef.current();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onDismissRef.current();
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open, ref]);
}

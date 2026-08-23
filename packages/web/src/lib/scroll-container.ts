const SCROLLABLE_OVERFLOW_VALUES = new Set(["auto", "overlay", "scroll"]);

export function allowsVerticalScroll(overflowY: string): boolean {
  return SCROLLABLE_OVERFLOW_VALUES.has(overflowY);
}

export function hasVerticalOverflow(element: Pick<HTMLElement, "clientHeight" | "scrollHeight">) {
  return element.scrollHeight - element.clientHeight > 1;
}

export function findScrollableYAncestor(
  start: HTMLElement,
  {
    boundary = null,
    fallback = null,
    getOverflowY = (element) => window.getComputedStyle(element).overflowY,
  }: {
    boundary?: HTMLElement | null;
    fallback?: Element | null;
    getOverflowY?: (element: HTMLElement) => string;
  } = {},
): Element | null {
  let element = start.parentElement;
  while (element) {
    if (allowsVerticalScroll(getOverflowY(element)) && hasVerticalOverflow(element)) {
      return element;
    }
    if (element === boundary) {
      break;
    }
    element = element.parentElement;
  }

  return fallback;
}

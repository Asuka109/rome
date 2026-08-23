export const TRACE_SCROLL_BOTTOM_THRESHOLD_PX = 48;

export function isTraceScrollNearBottom(
  scrollHeight: number,
  scrollTop: number,
  clientHeight: number,
  thresholdPx = TRACE_SCROLL_BOTTOM_THRESHOLD_PX,
): boolean {
  return scrollHeight - scrollTop - clientHeight <= thresholdPx;
}

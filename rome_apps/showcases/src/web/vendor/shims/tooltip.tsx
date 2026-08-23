// Minimal standalone shim for rome-core's `@/components/ui/tooltip` (a shadcn +
// Radix tooltip), used only by the vendored CollapsedTraceSummary. The static
// Showcases viewer doesn't need a floating tooltip, so TooltipTrigger renders
// its child as-is and TooltipContent renders nothing. This keeps the vendored
// component body verbatim. See ../VENDOR.md.

import type { ReactNode } from "react";

export function Tooltip({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function TooltipTrigger({ children }: { asChild?: boolean; children: ReactNode }) {
  return <>{children}</>;
}

export function TooltipContent(_props: { children?: ReactNode }) {
  return null;
}

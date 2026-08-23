import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface MessageRowProps {
  /** Left-gutter avatar (AgentAvatar). Sits beside — and the same height as —
   * the name + subtitle header. */
  avatar: ReactNode;
  /** Display name shown on the first header line. */
  name: string;
  /** Compact line under the name (the turn's trace). */
  subtitle?: ReactNode;
  /** Secondary turn metadata shown inline after the main trace summary. */
  headerAccessory?: ReactNode;
  children?: ReactNode;
  className?: string;
}

/** One row in the group-chat transcript. The header — avatar beside the
 * name (line 1) + trace (line 2) — is a self-contained, vertically-centered
 * unit, so the avatar matches the two-line block's height. The body sits below,
 * indented to align under the name. */
export function MessageRow({
  avatar,
  name,
  subtitle,
  headerAccessory,
  children,
  className,
}: MessageRowProps) {
  return (
    <div className={cn("mb-4", className)}>
      <div className="flex items-center gap-4">
        <div className="shrink-0">{avatar}</div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-ui text-foreground">{name}</div>
          {subtitle || headerAccessory ? (
            <div className="flex min-w-0 items-center">
              {subtitle ? <div className="shrink-0">{subtitle}</div> : null}
              {headerAccessory ? (
                <div className="min-w-0 flex-1 overflow-hidden">{headerAccessory}</div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
      {/* Indent past the avatar (size-8) + gap-4 so the body aligns under the name. */}
      {children ? <div className="mt-2 pl-12">{children}</div> : null}
    </div>
  );
}

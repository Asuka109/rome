// Vendored verbatim from packages/web/src/components/chat/MessageRow.tsx.
// The only seam is the `cn` import path. Keep byte-for-byte identical to
// upstream otherwise so the showcase replay matches the real chat transcript;
// re-sync per web/vendor/VENDOR.md when the chat page changes.
import type { ReactNode } from "react";
import { cn } from "../../lib/utils.js";

interface MessageRowProps {
  /** Left-gutter avatar (AgentAvatar). Sits beside — and the same height as —
   * the name + subtitle header. */
  avatar: ReactNode;
  /** Display name shown on the first header line. */
  name: string;
  /** Compact line under the name (the turn's trace). */
  subtitle?: ReactNode;
  children?: ReactNode;
  className?: string;
}

/** One row in the group-chat transcript. The header — avatar beside the
 * name (line 1) + trace (line 2) — is a self-contained, vertically-centered
 * unit, so the avatar matches the two-line block's height. The body sits below,
 * indented to align under the name. */
export function MessageRow({ avatar, name, subtitle, children, className }: MessageRowProps) {
  return (
    <div className={cn("mb-4", className)}>
      <div className="flex items-center gap-3">
        <div className="shrink-0">{avatar}</div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold leading-tight text-foreground">{name}</div>
          {subtitle ? <div className="leading-tight">{subtitle}</div> : null}
        </div>
      </div>
      {/* Indent past the avatar (size-8) + gap-3 so the body aligns under the name. */}
      {children ? <div className="mt-1.5 pl-11">{children}</div> : null}
    </div>
  );
}

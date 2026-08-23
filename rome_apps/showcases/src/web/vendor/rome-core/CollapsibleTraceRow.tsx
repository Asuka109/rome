// VENDORED from rome-internal with documented seams:
//   packages/web/src/components/agent-trace/CollapsibleTraceRow.tsx
// Import and typography seams are adapted (see ../VENDOR.md "seams"):
//   - "@radix-ui/react-icons"               -> ../shims/icons
import { useState, type ReactNode } from "react";
import { ChevronDownIcon, ChevronRightIcon } from "../shims/icons";

// Default body padding matches the trace-redesign mock's `.ts-group__body`
// (2px top, 0 right, 6px bottom, 6px left). Consumers that wrap something
// other than a tool group (e.g. a session card) can override.
const DEFAULT_BODY_CLASS = "pt-0.5 pr-0 pb-1.5 pl-1.5";

export function CollapsibleTraceRow({
  icon,
  label,
  labelSuffix,
  meta,
  defaultOpen = false,
  bodyClassName = DEFAULT_BODY_CLASS,
  children,
}: {
  icon: ReactNode;
  label: ReactNode;
  /** Optional inline element rendered immediately after the label, before
   *  the flex spacer that pushes `meta` to the right. */
  labelSuffix?: ReactNode;
  meta?: ReactNode;
  defaultOpen?: boolean;
  bodyClassName?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2.5 rounded-8 px-2.5 py-2.5 text-left text-sm font-medium text-foreground hover:bg-surface-muted"
      >
        <span className="inline-flex h-[22px] w-[22px] flex-none items-center justify-center rounded-8 bg-surface text-badge font-semibold text-muted-foreground ring-1 ring-border">
          {icon}
        </span>
        <span className="min-w-0 truncate text-foreground">{label}</span>
        {labelSuffix}
        <span className="flex-1" />
        {meta}
        <span className="flex-none text-subtle-foreground">
          {open ? <ChevronDownIcon /> : <ChevronRightIcon />}
        </span>
      </button>
      {open && <div className={bodyClassName}>{children}</div>}
    </div>
  );
}

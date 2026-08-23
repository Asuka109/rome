import * as React from "react";
import { cn } from "@/lib/utils";

// A trimmed shadcn `Item`: a bordered row with a title + description on the left
// and an actions slot on the right. Enough for the idea picker; add variants if
// another surface needs them.

export const Item = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "flex items-center gap-3 rounded-12 border border-border bg-card p-3",
        className,
      )}
      {...props}
    />
  ),
);
Item.displayName = "Item";

export function ItemContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex min-w-0 flex-1 flex-col gap-0.5", className)} {...props} />;
}

export function ItemTitle({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn("text-sm font-medium leading-snug text-foreground", className)} {...props} />
  );
}

export function ItemDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn("text-xs leading-relaxed text-muted-foreground", className)} {...props} />
  );
}

export function ItemActions({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex shrink-0 items-center gap-2", className)} {...props} />;
}

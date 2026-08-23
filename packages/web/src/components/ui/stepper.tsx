import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface StepperProps {
  steps: readonly string[];
  current: number;
  className?: string;
}

/**
 * Linear numbered stepper. Filled circle + connector + hollow circle, with
 * labels below. `current` is 0-based; earlier steps render as complete (check
 * icon), the current step as active, later steps as pending.
 */
export function Stepper({ steps, current, className }: StepperProps) {
  return (
    <div
      role="list"
      aria-label={`Step ${current + 1} of ${steps.length}`}
      className={cn("flex items-start justify-center", className)}
    >
      {steps.map((label, i) => {
        const isComplete = i < current;
        const isCurrent = i === current;
        const isLast = i === steps.length - 1;
        return (
          <div key={label} role="listitem" className="flex items-start">
            <div className="flex flex-col items-center gap-2">
              <div
                aria-current={isCurrent ? "step" : undefined}
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full border text-badge transition-colors",
                  (isComplete || isCurrent) && "border-foreground bg-foreground text-background",
                  !isComplete && !isCurrent && "border-border bg-surface text-subtle-foreground",
                )}
              >
                {isComplete ? <Check className="h-3.5 w-3.5" aria-hidden /> : i + 1}
              </div>
              <span
                className={cn(
                  "text-aux",
                  isCurrent || isComplete ? "text-foreground" : "text-subtle-foreground",
                )}
              >
                {label}
              </span>
            </div>
            {!isLast && (
              <div aria-hidden className="mx-3 flex h-7 w-16 items-center">
                <span
                  className={cn(
                    "h-px w-full transition-colors",
                    isComplete ? "bg-foreground" : "bg-border",
                  )}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

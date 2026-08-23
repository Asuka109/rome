import type { ReactNode } from "react";
import { Check } from "lucide-react";
import type { AppComponentContext } from "@rome-os/app-web-sdk";
import { cn } from "./utils";

export interface Choice {
  /** Submitted value (under `outputKey`). */
  value: string;
  title: string;
  desc?: string;
  icon?: ReactNode;
}

/**
 * Pickable option buttons. On click it submits `{ [outputKey]: choice.value }`
 * and locks; on re-mount of a resolved card it shows the picked option
 * highlighted and the rest dimmed. `columns: 2` lays the options out side by
 * side (tiles); otherwise they stack as a vertical list. Each option is styled
 * to read as a button — colored icon chip, hover lift + shadow, press feedback.
 */
export function ChoiceCard({
  ctx,
  choices,
  outputKey = "value",
  summaryOf,
  columns = 1,
}: {
  ctx: AppComponentContext;
  choices: Choice[];
  outputKey?: string;
  summaryOf?: (c: Choice) => string;
  columns?: 1 | 2;
}) {
  const resolved = ctx.host.resolved;
  const picked =
    typeof ctx.result?.[outputKey] === "string" ? (ctx.result[outputKey] as string) : null;
  const grid = columns === 2;

  const pick = (c: Choice) => {
    if (resolved) return;
    ctx.host.submit({ [outputKey]: c.value }, summaryOf ? summaryOf(c) : c.title);
  };

  return (
    <div className={grid ? "grid grid-cols-2 gap-2.5" : "flex flex-col gap-2"}>
      {choices.map((c) => {
        const isPicked = picked === c.value;
        return (
          <button
            key={c.value}
            type="button"
            disabled={resolved}
            onClick={() => pick(c)}
            className={cn(
              "relative rounded-12 border p-3 text-left transition-all duration-150",
              grid ? "flex flex-col gap-2" : "flex items-start gap-3",
              resolved
                ? isPicked
                  ? "border-primary bg-primary/5"
                  : "border-border opacity-40"
                : "cursor-pointer border-border bg-card shadow-1 hover:-translate-y-0.5 hover:border-primary/60 hover:bg-primary/[0.05] hover:shadow-4 active:translate-y-0 active:scale-[0.99]",
            )}
          >
            {c.icon ? (
              <span
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-8 bg-primary/10 text-primary",
                  grid ? "" : "mt-0.5",
                )}
              >
                {c.icon}
              </span>
            ) : null}
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-foreground">{c.title}</span>
              {c.desc ? (
                <span className="mt-0.5 block text-xs text-muted-foreground">{c.desc}</span>
              ) : null}
            </span>
            {isPicked ? (
              <Check
                className={cn(
                  "size-4 shrink-0 text-primary",
                  grid ? "absolute right-2 top-2" : "mt-0.5",
                )}
              />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

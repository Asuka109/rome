import {
  ArrowUpRight,
  Box,
  Calculator,
  ChartCandlestick,
  Disc3,
  Dumbbell,
  Heart,
  Map,
  Moon,
  Music,
  Palette,
  Plug,
  Send,
  Shovel,
  Spade,
  Store,
  Users,
  Utensils,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { navigateRome, type NavigateRomePayload } from "@rome-os/app-web-sdk";
import type { PresetItem } from "../../trace/portable.js";

// Icons referenced by the server catalog's `icon` field (a lucide-react name).
// Unknown / missing names fall back to a neutral box.
const ICONS: Record<string, LucideIcon> = {
  Send,
  Plug,
  Store,
  Utensils,
  Dumbbell,
  Music,
  Users,
  Heart,
  Map,
  Wallet,
  ChartCandlestick,
  Calculator,
  Palette,
  Moon,
  Spade,
  Disc3,
  Shovel,
};

function iconFor(name: string | null | undefined): LucideIcon {
  return (name && ICONS[name]) || Box;
}

const PRIMARY_CTA =
  "inline-flex h-9 items-center gap-1.5 rounded-8 bg-primary px-3 text-sm font-medium text-primary-foreground hover:opacity-90";
const SECONDARY_CTA =
  "inline-flex h-9 items-center rounded-8 border border-border bg-surface px-3 text-sm text-foreground hover:bg-surface-muted";

export function PresetCard({ item }: { item: PresetItem }) {
  const Icon = iconFor(item.icon);
  const { mainCta, tryCta, traceUrl, cardHref } = item;
  const mainHref = mainCta?.href;
  const mainNavigate = mainCta?.navigate;
  const isExternal = !!mainHref && /^https?:\/\//i.test(mainHref);
  const cardExternal = !!cardHref && /^https?:\/\//i.test(cardHref);

  return (
    <div
      className={`relative flex flex-col gap-3 rounded-12 border border-border bg-surface p-4 ${
        cardHref ? "transition-colors hover:border-primary" : ""
      }`}
    >
      {/* Stretched-link overlay: makes the whole card a link to `cardHref`. Inner
          CTAs sit above it (relative z-10) so they keep their own click targets. */}
      {cardHref ? (
        <a
          href={cardHref}
          {...(cardExternal ? { target: "_blank", rel: "noopener noreferrer" } : {})}
          aria-label={item.title}
          className="absolute inset-0 rounded-12 focus-visible:outline-2 focus-visible:outline-ring"
        />
      ) : null}

      <div className="flex items-center gap-2">
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-8 bg-surface-muted text-foreground">
          <Icon size={18} />
        </span>
        <h3 className="font-medium text-foreground">{item.title}</h3>
      </div>

      {item.description ? (
        <p className="line-clamp-3 text-sm text-muted-foreground">{item.description}</p>
      ) : null}

      <div className="relative z-10 mt-auto flex flex-wrap items-center gap-2 pt-1">
        {mainCta && mainHref ? (
          <a
            href={mainHref}
            {...(isExternal ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            className={PRIMARY_CTA}
          >
            {mainCta.label}
            {isExternal ? <ArrowUpRight size={15} /> : null}
          </a>
        ) : mainCta && mainNavigate ? (
          <button
            type="button"
            onClick={() => navigateRome(mainNavigate as NavigateRomePayload)}
            className={PRIMARY_CTA}
          >
            {mainCta.label}
          </button>
        ) : null}

        {tryCta ? (
          <button
            type="button"
            onClick={() => navigateRome({ path: "chat/new", draft: tryCta.draft })}
            className={SECONDARY_CTA}
          >
            {tryCta.label}
          </button>
        ) : null}
      </div>

      {traceUrl ? (
        <a
          href={traceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="relative z-10 text-xs font-medium text-primary hover:underline"
        >
          See how it was built →
        </a>
      ) : null}
    </div>
  );
}

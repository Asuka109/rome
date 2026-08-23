/**
 * Shared status presentation for the unified Connections surface.
 *
 * `StatusIndicator` is a dot (semantic color token) + text — NOT a filled
 * `Badge`. It is the single source of the status vocabulary so the list and the
 * detail-page header render identically.
 *
 * Four labels — chosen so each means something genuinely different to the
 * guardian ("Disconnected" is banned vocabulary):
 *   Connected     → it works.
 *   Degraded      → it is authorized but temporarily impaired; recovery may
 *                   happen automatically.
 *   Not connected → it doesn't work, but you can fix it (open to connect,
 *                   finish verification, or reconnect a broken credential).
 *   Unavailable   → it doesn't work and you *can't* fix it (host misconfig);
 *                   carries the reason as a tooltip.
 *
 * The dot and warning icon carry a fourth, finer-grained signal — `attention` —
 * layered on top of the "Not connected" label for a credential that WAS
 * conferred and is now degraded (the ledger knows it is broken), not just a
 * first-time setup. The vocabulary above stays three deep.
 *
 * Mapping over the card's registry-native slot states:
 *   alwaysOn (webchat)                     → green dot, "Connected"
 *   transient runtime degradation          → amber dot, "Degraded"
 *   any slot degraded                      → amber dot, "Not connected" (attention)
 *   any slot authorized                    → green dot, "Connected"
 *   none conferred + connect unavailable   → muted dot, "Unavailable" (reason tooltip)
 *   everything else                        → muted dot, "Not connected"
 */

import { cn } from "@/lib/utils";
import type { ConnectionCard } from "@/lib/connection-cards";
import { AlertTriangle } from "lucide-react";

type DotTone = "success" | "attention" | "muted";

export interface ConnectionStatus {
  label: string;
  tone: DotTone;
  /** Optional detail surfaced as a hover tooltip. */
  title?: string;
}

/** Maps a card's slot grant states onto the dot+text status vocabulary. */
export function connectionStatus(card: ConnectionCard): ConnectionStatus {
  if (card.alwaysOn) {
    return { label: "Connected", tone: "success" };
  }
  if (card.degradation) {
    const retry = card.degradation.retryAt
      ? ` Automatic retry at ${card.degradation.retryAt}.`
      : "";
    return {
      label: "Degraded",
      tone: "attention",
      title: `${card.degradation.reason}${retry}`,
    };
  }
  const states = new Set(card.slots.map((slot) => slot.state));
  // A degraded credential surfaces even when a sibling slot still works — a
  // broken conferral needs the guardian's attention more than "1 of 2 works".
  if (states.has("degraded")) {
    return {
      label: "Not connected",
      tone: "attention",
      title: "Access expired — reconnect",
    };
  }
  if (states.has("authorized")) {
    return { label: "Connected", tone: "success" };
  }
  // A service the host can't offer (misconfig) is the only "you can't fix this"
  // case; everything else is a fixable "Not connected" whose specific next step
  // lives in the detail view.
  if (card.connect && !card.connect.available) {
    return {
      label: "Unavailable",
      tone: "muted",
      title: card.connect.unavailableReason ?? undefined,
    };
  }
  return { label: "Not connected", tone: "muted" };
}

const DOT_TONE: Record<DotTone, string> = {
  success: "bg-success",
  attention: "bg-warning",
  // A hollow muted dot reads as neutral without competing with the live tone.
  muted: "border border-muted-foreground/40",
};

/**
 * A status dot + label. Pass a `ConnectionCard` (resolves the vocabulary via
 * `connectionStatus`) or a pre-resolved `ConnectionStatus`.
 */
export function StatusIndicator({
  card,
  status,
  className,
}: {
  card?: ConnectionCard;
  status?: ConnectionStatus;
  className?: string;
}) {
  const resolved = status ?? (card ? connectionStatus(card) : undefined);
  if (!resolved) return null;

  return (
    <span
      className={cn("inline-flex items-center gap-2 text-ui text-muted-foreground", className)}
      title={resolved.title}
    >
      <span
        className={cn("inline-block size-2 shrink-0 rounded-full", DOT_TONE[resolved.tone])}
        aria-hidden
      />
      {resolved.tone === "attention" ? (
        <AlertTriangle className="size-3.5 shrink-0" aria-hidden />
      ) : null}
      {resolved.label}
    </span>
  );
}

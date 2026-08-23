import type { RomeSessionType, RunOutcomeSummary, RunUsageSummary } from "@rome/api-types/sessions";

export const SESSION_TYPE_LABELS: Record<RomeSessionType, string> = {
  webchat: "Chat",
  webchat_handoff: "Handoff",
  channel: "Channel",
  action: "Automation",
  fork: "Branch",
  subagent: "Subagent",
};

export function formatCompactNumber(value: number): string {
  return new Intl.NumberFormat(undefined, {
    notation: value >= 10_000 ? "compact" : "standard",
    maximumFractionDigits: value >= 1_000 ? 1 : 0,
  }).format(value);
}

export function formatCost(value: number | null): string {
  if (value === null) return "Unavailable";
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: value < 1 ? 2 : 0,
    maximumFractionDigits: value < 1 ? 3 : 2,
  }).format(value);
}

export function formatDate(value?: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatRelativeDate(value?: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  const delta = date.getTime() - Date.now();
  if (Number.isNaN(delta)) return "—";
  const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  const abs = Math.abs(delta);
  if (abs < 60_000) return "just now";
  if (abs < 3_600_000) return formatter.format(Math.round(delta / 60_000), "minute");
  if (abs < 86_400_000) return formatter.format(Math.round(delta / 3_600_000), "hour");
  if (abs < 7 * 86_400_000) return formatter.format(Math.round(delta / 86_400_000), "day");
  return formatDate(value);
}

export function formatOutcome(outcomes: RunOutcomeSummary): string {
  const known = outcomes.completed + outcomes.error + outcomes.interrupted;
  if (known === 0) return outcomes.unknown > 0 ? `${outcomes.unknown} unknown` : "No runs";
  const parts = [];
  if (outcomes.completed) parts.push(`${outcomes.completed} completed`);
  if (outcomes.error) parts.push(`${outcomes.error} failed`);
  if (outcomes.interrupted) parts.push(`${outcomes.interrupted} stopped`);
  if (outcomes.unknown) parts.push(`${outcomes.unknown} unknown`);
  return parts.join(" · ");
}

export function costCoverage(usage: RunUsageSummary, runCount: number): string | null {
  if (usage.costedRunCount === 0 || usage.costedRunCount === runCount) return null;
  return `${usage.costedRunCount} of ${runCount} runs costed`;
}

export function sourceLabel(value: string | null): string {
  if (!value) return "Internal";
  return value.replace(/[_-]+/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

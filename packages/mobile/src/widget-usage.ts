export type WidgetProviderId = "codex" | "claude";
export type WidgetUsageWindowKey = "fiveHour" | "sevenDay";
export type WidgetUsageTone = "success" | "warning" | "destructive" | "muted";

export interface WidgetUsageWindow {
  usedPercent: number;
  resetsAt?: number;
}

export interface WidgetProviderUsage {
  id: WidgetProviderId;
  status: "ready" | "not-connected" | "unavailable";
  quotaExhausted: boolean;
  checkedAt?: number;
  fiveHour?: WidgetUsageWindow;
  sevenDay?: WidgetUsageWindow;
}

export interface TokenUsageWidgetProps {
  schemaVersion: 1;
  state: "ready" | "auth-required" | "offline" | "empty";
  updatedAt: number;
  refreshRequestId?: number;
  assets?: {
    codexLogo?: string;
    claudeLogo?: string;
    romeLogo?: string;
  };
  providers: [WidgetProviderUsage, WidgetProviderUsage];
}

export interface WidgetTimelineEntry {
  date: Date;
  props: TokenUsageWidgetProps;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parsePercent(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  return Math.max(0, Math.min(100, Math.round(value * 10) / 10));
}

function parseTimestamp(value: unknown): number | undefined {
  if (typeof value !== "string" || value.trim() === "") return undefined;
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : undefined;
}

function parseWindow(value: unknown): WidgetUsageWindow | undefined {
  if (!isRecord(value)) return undefined;
  const usedPercent = parsePercent(value.usedPercent);
  if (usedPercent === undefined) return undefined;
  const resetsAt = parseTimestamp(value.resetsAt);
  return resetsAt === undefined ? { usedPercent } : { usedPercent, resetsAt };
}

function parseProvider(id: WidgetProviderId, value: unknown, now: number): WidgetProviderUsage {
  if (!isRecord(value)) {
    return { id, status: "unavailable", quotaExhausted: false };
  }

  const usage = isRecord(value.usage) ? value.usage : undefined;
  const fiveHour = parseWindow(usage?.fiveHour);
  const sevenDay = parseWindow(usage?.sevenDay);
  const hasUsage = fiveHour !== undefined || sevenDay !== undefined;
  const loggedIn = typeof value.loggedIn === "boolean" ? value.loggedIn : undefined;
  if (loggedIn === false) {
    return { id, status: "not-connected", quotaExhausted: false };
  }
  const checkedAt = parseTimestamp(usage?.checkedAt) ?? (hasUsage ? now : undefined);
  const quotaExhausted =
    value.quotaExhausted === true || fiveHour?.usedPercent === 100 || sevenDay?.usedPercent === 100;

  return {
    id,
    status: hasUsage ? "ready" : "unavailable",
    quotaExhausted,
    ...(checkedAt === undefined ? {} : { checkedAt }),
    ...(fiveHour === undefined ? {} : { fiveHour }),
    ...(sevenDay === undefined ? {} : { sevenDay }),
  };
}

export function createWidgetUsageSnapshot(
  value: unknown,
  now: number = Date.now(),
): TokenUsageWidgetProps | null {
  if (!isRecord(value)) return null;

  const codex = parseProvider("codex", value.codex, now);
  const claude = parseProvider("claude", value.claude, now);
  const providers: TokenUsageWidgetProps["providers"] = [codex, claude];
  const readyProviders = providers.filter((provider) => provider.status === "ready");
  const state = readyProviders.length > 0 ? "ready" : "empty";

  return {
    schemaVersion: 1,
    state,
    updatedAt: now,
    providers,
  };
}

export function createAuthRequiredWidgetSnapshot(now: number = Date.now()): TokenUsageWidgetProps {
  return {
    schemaVersion: 1,
    state: "auth-required",
    updatedAt: now,
    providers: [
      { id: "codex", status: "unavailable", quotaExhausted: false },
      { id: "claude", status: "unavailable", quotaExhausted: false },
    ],
  };
}

export function createOfflineWidgetSnapshot(
  previous: TokenUsageWidgetProps | null,
  now: number = Date.now(),
): TokenUsageWidgetProps {
  const base: TokenUsageWidgetProps = previous ?? {
    schemaVersion: 1,
    state: "empty",
    updatedAt: now,
    providers: [
      { id: "codex", status: "unavailable", quotaExhausted: false },
      { id: "claude", status: "unavailable", quotaExhausted: false },
    ],
  };
  return {
    ...base,
    state: "offline",
    updatedAt: now,
  };
}

export function buildWidgetTimeline(
  snapshot: TokenUsageWidgetProps,
  now: number = Date.now(),
): WidgetTimelineEntry[] {
  return [{ date: new Date(now), props: { ...snapshot, updatedAt: now } }];
}

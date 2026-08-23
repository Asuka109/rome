import { normalizePublicAccessEmail } from "./public-access-config.js";

export interface DashboardAccessConfig {
  cloudEmailAccess: string[];
}

export const DASHBOARD_ACCESS_SETTING_KEY = "dashboardAccess";

export const DEFAULT_DASHBOARD_ACCESS_CONFIG: DashboardAccessConfig = {
  cloudEmailAccess: [],
};

function normalizeEmailList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return Array.from(
    new Set(raw.map(normalizePublicAccessEmail).filter((email): email is string => email !== null)),
  ).sort();
}

export function normalizeDashboardAccessConfig(raw: unknown): DashboardAccessConfig {
  const body = (raw ?? {}) as { cloudEmailAccess?: unknown };
  return {
    cloudEmailAccess: normalizeEmailList(body.cloudEmailAccess),
  };
}

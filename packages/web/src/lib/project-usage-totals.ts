import type { ProjectDashboardUsageDay } from "@rome/api-types/projects";

export interface ProjectUsageTokenBreakdown {
  cached: number;
  input: number;
  output: number;
  total: number;
}

export interface ProjectUsageChartTotals extends ProjectUsageTokenBreakdown {
  cacheRead: number;
  cacheWrite: number;
  cost: number;
}

export function buildProjectUsageTokenBreakdown(
  usage: Pick<
    ProjectDashboardUsageDay,
    "cacheReadTokens" | "cacheWriteTokens" | "inputTokens" | "outputTokens"
  >,
): ProjectUsageTokenBreakdown {
  const cached = usage.cacheReadTokens;
  const input = usage.inputTokens + usage.cacheWriteTokens;
  const output = usage.outputTokens;

  return {
    cached,
    input,
    output,
    total: cached + input + output,
  };
}

export function buildProjectUsageChartTotals(
  usage: ProjectDashboardUsageDay[],
): ProjectUsageChartTotals {
  const totals = usage.reduce(
    (acc, day) => {
      const breakdown = buildProjectUsageTokenBreakdown(day);
      acc.cacheRead += day.cacheReadTokens;
      acc.cacheWrite += day.cacheWriteTokens;
      acc.cached += breakdown.cached;
      acc.cost += day.costUsd;
      acc.input += breakdown.input;
      acc.output += breakdown.output;
      acc.total += breakdown.total;
      return acc;
    },
    {
      cacheRead: 0,
      cacheWrite: 0,
      cached: 0,
      cost: 0,
      input: 0,
      output: 0,
      total: 0,
    },
  );

  return totals;
}

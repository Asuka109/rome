#!/usr/bin/env node
// Guardian-account model usage for managed ClickStack. Rome Cloud provisions
// each instance with instances.slug = users.slug and Rome exports that slug as
// ResourceAttributes['service.instance.id'], so this dimension covers existing
// history without a second identity pipeline or guardian email in telemetry.

import { applyAll, detId } from "./clickstack.mjs";

export const ownerTag = "guardian-usage";
export const requiredSources = ["traces"];

const MODEL_TURN = "SpanName = 'model.turn'";
const ACCOUNT =
  "if(empty(ResourceAttributes['service.instance.id']), 'unknown', ResourceAttributes['service.instance.id'])";
const INPUT = "toUInt64OrZero(SpanAttributes['input_tokens'])";
const CACHE_READ = "toUInt64OrZero(SpanAttributes['cache_read_input_tokens'])";
const CACHE_WRITE = "toUInt64OrZero(SpanAttributes['cache_creation_input_tokens'])";
const OUTPUT = "toUInt64OrZero(SpanAttributes['output_tokens'])";
const TOKENS = `(${INPUT} + ${CACHE_READ} + ${CACHE_WRITE} + ${OUTPUT})`;
const COST = "toFloat64OrZero(SpanAttributes['estimated_cost_usd'])";

const tokenFormat = { output: "number", mantissa: 0, thousandSeparated: true };
const usdFormat = {
  output: "currency",
  currencySymbol: "$",
  mantissa: 2,
  thousandSeparated: true,
};
const percentFormat = { output: "percent", mantissa: 1 };

export function buildDashboards({ traces, tracesConnection }) {
  const dashboardName = "Rome · Guardian Usage";
  const tileId = (name) => detId(`${dashboardName}::${name}`);
  const select = (aggFn, valueExpression, alias, numberFormat) => ({
    aggFn,
    ...(valueExpression ? { valueExpression } : {}),
    alias,
    where: MODEL_TURN,
    whereLanguage: "sql",
    ...(numberFormat ? { numberFormat } : {}),
  });
  const builder = (name, containerId, x, y, w, h, displayType, selects, extra = {}) => ({
    id: tileId(name),
    name,
    containerId,
    x,
    y,
    w,
    h,
    config: {
      name,
      sourceId: traces,
      displayType,
      select: selects,
      ...extra,
    },
  });
  const rawSql = (name, containerId, x, y, w, h, displayType, sqlTemplate, numberFormat) => ({
    id: tileId(name),
    name,
    containerId,
    x,
    y,
    w,
    h,
    config: {
      name,
      configType: "sql",
      connectionId: tracesConnection,
      sourceId: traces,
      displayType,
      sqlTemplate,
      ...(numberFormat ? { numberFormat } : {}),
      ...(displayType === "line" || displayType === "stacked_bar"
        ? { alignDateRangeToGranularity: true, fillNulls: true }
        : {}),
    },
  });

  const dailyTokensSql = `
SELECT
  toStartOfDay(Timestamp, 'UTC') AS ts,
  ${ACCOUNT} AS guardian_account,
  sum(${TOKENS}) AS tokens
FROM $__sourceTable
WHERE $__timeFilter_ms(Timestamp)
  AND $__filters
  AND ${MODEL_TURN}
GROUP BY ts, guardian_account
ORDER BY ts ASC, guardian_account ASC
LIMIT 10000`;

  const dailyCostSql = `
SELECT
  toStartOfDay(Timestamp, 'UTC') AS ts,
  ${ACCOUNT} AS guardian_account,
  sum(${COST}) AS estimated_cost_usd
FROM $__sourceTable
WHERE $__timeFilter_ms(Timestamp)
  AND $__filters
  AND ${MODEL_TURN}
GROUP BY ts, guardian_account
ORDER BY ts ASC, guardian_account ASC
LIMIT 10000`;

  const accountTotalsSql = `
SELECT
  ${ACCOUNT} AS guardian_account,
  count() AS model_turns,
  countIf(${TOKENS} > 0) AS token_bearing_turns,
  countIf(${TOKENS} > 0 AND SpanAttributes['estimated_cost_usd'] != '') AS priced_turns,
  if(token_bearing_turns = 0, 0, round(priced_turns / token_bearing_turns * 100, 2)) AS cost_coverage_pct,
  sum(${INPUT}) AS input_tokens,
  sum(${CACHE_READ}) AS cache_read_tokens,
  sum(${CACHE_WRITE}) AS cache_write_tokens,
  sum(${OUTPUT}) AS output_tokens,
  sum(${TOKENS}) AS total_tokens,
  round(sum(${COST}), 4) AS estimated_cost_usd,
  max(Timestamp) AS last_seen
FROM $__sourceTable
WHERE $__timeFilter_ms(Timestamp)
  AND $__filters
  AND ${MODEL_TURN}
GROUP BY guardian_account
ORDER BY total_tokens DESC
LIMIT 100`;

  const dailyBreakdownSql = `
SELECT
  toDate(Timestamp, 'UTC') AS day_utc,
  ${ACCOUNT} AS guardian_account,
  count() AS model_turns,
  countIf(${TOKENS} > 0) AS token_bearing_turns,
  countIf(${TOKENS} > 0 AND SpanAttributes['estimated_cost_usd'] != '') AS priced_turns,
  if(token_bearing_turns = 0, 0, round(priced_turns / token_bearing_turns * 100, 2)) AS cost_coverage_pct,
  sum(${INPUT}) AS input_tokens,
  sum(${CACHE_READ}) AS cache_read_tokens,
  sum(${CACHE_WRITE}) AS cache_write_tokens,
  sum(${OUTPUT}) AS output_tokens,
  sum(${TOKENS}) AS total_tokens,
  round(sum(${COST}), 4) AS estimated_cost_usd
FROM $__sourceTable
WHERE $__timeFilter_ms(Timestamp)
  AND $__filters
  AND ${MODEL_TURN}
GROUP BY day_utc, guardian_account
ORDER BY day_utc DESC, total_tokens DESC
LIMIT 1000`;

  return [
    {
      name: dashboardName,
      tags: [ownerTag],
      containers: [
        { id: "overview", title: "Overview", collapsed: false },
        { id: "daily-trends", title: "Daily trends (UTC)", collapsed: false },
        { id: "breakdown", title: "Account breakdown", collapsed: false },
      ],
      tiles: [
        builder(
          "Total tokens",
          "overview",
          0,
          0,
          5,
          4,
          "number",
          [select("sum", TOKENS, "Tokens", tokenFormat)],
          { numberFormat: tokenFormat },
        ),
        builder(
          "Estimated cost",
          "overview",
          5,
          0,
          5,
          4,
          "number",
          [select("sum", COST, "Estimated cost", usdFormat)],
          { numberFormat: usdFormat },
        ),
        builder(
          "Model turns",
          "overview",
          10,
          0,
          5,
          4,
          "number",
          [select("count", "", "Model turns", tokenFormat)],
          { numberFormat: tokenFormat },
        ),
        rawSql(
          "Active guardian accounts",
          "overview",
          15,
          0,
          5,
          4,
          "number",
          `SELECT uniqExact(${ACCOUNT}) AS active_guardian_accounts
FROM $__sourceTable
WHERE $__timeFilter_ms(Timestamp)
  AND $__filters
  AND ${MODEL_TURN}
LIMIT 1`,
          tokenFormat,
        ),
        rawSql(
          "Cost coverage",
          "overview",
          20,
          0,
          4,
          4,
          "number",
          `SELECT if(
  countIf(${TOKENS} > 0) = 0,
  0,
  countIf(${TOKENS} > 0 AND SpanAttributes['estimated_cost_usd'] != '') / countIf(${TOKENS} > 0)
) AS cost_coverage
FROM $__sourceTable
WHERE $__timeFilter_ms(Timestamp)
  AND $__filters
  AND ${MODEL_TURN}
LIMIT 1`,
          percentFormat,
        ),
        rawSql(
          "Daily tokens by guardian account",
          "daily-trends",
          0,
          4,
          12,
          9,
          "stacked_bar",
          dailyTokensSql,
          tokenFormat,
        ),
        rawSql(
          "Daily estimated cost by guardian account",
          "daily-trends",
          12,
          4,
          12,
          9,
          "stacked_bar",
          dailyCostSql,
          usdFormat,
        ),
        rawSql("Guardian account totals", "breakdown", 0, 13, 24, 9, "table", accountTotalsSql),
        rawSql(
          "Daily guardian account breakdown",
          "breakdown",
          0,
          22,
          24,
          10,
          "table",
          dailyBreakdownSql,
        ),
        builder(
          "Recent model turns",
          "breakdown",
          0,
          32,
          24,
          10,
          "search",
          "Timestamp, ResourceAttributes['service.instance.id'] AS guardian_account, SpanAttributes['model.id'] AS model, SpanAttributes['input_tokens'] AS input_tokens, SpanAttributes['cache_read_input_tokens'] AS cache_read_tokens, SpanAttributes['cache_creation_input_tokens'] AS cache_write_tokens, SpanAttributes['output_tokens'] AS output_tokens, SpanAttributes['estimated_cost_usd'] AS estimated_cost_usd, SpanAttributes['session.id'] AS session, TraceId",
          { where: MODEL_TURN, whereLanguage: "sql", orderBy: "Timestamp DESC" },
        ),
      ],
      filters: [
        {
          type: "QUERY_EXPRESSION",
          name: "Guardian account",
          expression: ACCOUNT,
          whereLanguage: "sql",
          sourceId: traces,
        },
        {
          type: "QUERY_EXPRESSION",
          name: "Model",
          expression: "SpanAttributes['model.id']",
          whereLanguage: "sql",
          sourceId: traces,
        },
        {
          type: "QUERY_EXPRESSION",
          name: "Environment",
          expression: "ResourceAttributes['deployment.environment']",
          whereLanguage: "sql",
          sourceId: traces,
        },
      ],
    },
  ];
}

if (import.meta.url === `file://${process.argv[1]}`) {
  applyAll([{ ownerTag, requiredSources, buildDashboards }]).catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}

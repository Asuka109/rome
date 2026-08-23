#!/usr/bin/env node
// Platform-wide log volume and storage for managed ClickStack. Selected-window
// tiles query the log source and honor dashboard filters. Physical storage tiles
// query system.parts and are explicitly labelled as all retained logs because
// compressed bytes cannot be attributed to an individual source row or filter.

import { applyAll, detId } from "./clickstack.mjs";

export const ownerTag = "log-volume-storage";
export const requiredSources = ["logs"];

const countFormat = { output: "number", mantissa: 0, thousandSeparated: true };
const decimalFormat = { output: "number", mantissa: 2, thousandSeparated: true };
const INSTANCE =
  "if(empty(ResourceAttributes['service.instance.id']), 'unknown', ResourceAttributes['service.instance.id'])";
const COMPONENT = "if(empty(LogAttributes['component']), 'unknown', LogAttributes['component'])";
const SEVERITY = "if(empty(SeverityText), 'unspecified', SeverityText)";
const RESOURCE_SERVICE = "if(empty(ServiceName), 'unknown', ServiceName)";
const LEGACY_APP_LOG =
  `(startsWith(${COMPONENT}, 'app:') OR ` +
  `(${COMPONENT} = 'app-api' AND notEmpty(LogAttributes['appId'])))`;
const LOG_SERVICE =
  `multiIf(` +
  `notEmpty(LogAttributes['rome.log.source']), LogAttributes['rome.log.source'], ` +
  `${RESOURCE_SERVICE} = 'rome' AND ${LEGACY_APP_LOG}, 'rome-apps', ` +
  `${RESOURCE_SERVICE})`;
const APP =
  `multiIf(` +
  `notEmpty(LogAttributes['rome.app.id']), LogAttributes['rome.app.id'], ` +
  `notEmpty(LogAttributes['appId']), LogAttributes['appId'], ` +
  `startsWith(${COMPONENT}, 'app:'), extract(${COMPONENT}, '^app:([^:]+)'), ` +
  `'none')`;

export function buildDashboards({ logs, logsConnection }) {
  const dashboardName = "Rome · Log Volume & Storage";
  const tileId = (name) => detId(`${dashboardName}::${name}`);
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
      connectionId: logsConnection,
      sourceId: logs,
      displayType,
      sqlTemplate,
      ...(numberFormat ? { numberFormat } : {}),
      ...(displayType === "line" || displayType === "stacked_bar"
        ? { alignDateRangeToGranularity: true, fillNulls: true }
        : {}),
    },
  });
  const aggregate = (
    name,
    containerId,
    x,
    y,
    w,
    h,
    displayType,
    aggFn,
    valueExpression,
    groupBy,
    numberFormat,
  ) => ({
    id: tileId(name),
    name,
    containerId,
    x,
    y,
    w,
    h,
    config: {
      name,
      sourceId: logs,
      displayType,
      select: [
        {
          aggFn,
          valueExpression,
          where: "",
          whereLanguage: "sql",
          ...(numberFormat ? { numberFormat } : {}),
        },
      ],
      groupBy,
      granularity: "auto",
      ...(numberFormat ? { numberFormat } : {}),
    },
  });

  const selectedWindow = `FROM $__sourceTable
WHERE $__timeFilter_ms(Timestamp)
  AND $__filters`;

  return [
    {
      name: dashboardName,
      tags: [ownerTag],
      containers: [
        { id: "overview", title: "Overview", collapsed: false },
        { id: "trends", title: "Selected-window trends", collapsed: false },
        { id: "breakdown", title: "Volume attribution", collapsed: false },
      ],
      tiles: [
        rawSql(
          "Log entries",
          "overview",
          0,
          0,
          6,
          4,
          "number",
          `SELECT count() AS log_entries
${selectedWindow}
LIMIT 1`,
          countFormat,
        ),
        rawSql(
          "Message body size (MiB)",
          "overview",
          6,
          0,
          6,
          4,
          "number",
          `SELECT round(sum(length(Body)) / 1048576, 2) AS message_body_mib
${selectedWindow}
LIMIT 1`,
          decimalFormat,
        ),
        rawSql(
          "Average message size (bytes)",
          "overview",
          12,
          0,
          6,
          4,
          "number",
          `SELECT round(avg(length(Body)), 2) AS average_message_bytes
${selectedWindow}
LIMIT 1`,
          decimalFormat,
        ),
        rawSql(
          "Compressed table storage (MiB, all retained logs)",
          "overview",
          18,
          0,
          6,
          4,
          "number",
          `SELECT round(sum(bytes_on_disk) / 1048576, 2) AS compressed_storage_mib
FROM system.parts
WHERE active
  AND database = currentDatabase()
  AND table = 'otel_logs'
LIMIT 1`,
          decimalFormat,
        ),
        aggregate(
          "Log entries over time by service",
          "trends",
          0,
          4,
          12,
          9,
          "stacked_bar",
          "count",
          "",
          LOG_SERVICE,
          countFormat,
        ),
        aggregate(
          "Message body bytes over time by service",
          "trends",
          12,
          4,
          12,
          9,
          "line",
          "sum",
          "length(Body)",
          LOG_SERVICE,
          countFormat,
        ),
        rawSql(
          "Top components",
          "breakdown",
          0,
          13,
          12,
          10,
          "table",
          `SELECT
  ${LOG_SERVICE} AS service,
  ${APP} AS app,
  ${COMPONENT} AS component,
  count() AS log_entries,
  round(sum(length(Body)) / 1048576, 2) AS message_body_mib,
  round(avg(length(Body)), 2) AS average_message_bytes,
  max(Timestamp) AS last_seen
${selectedWindow}
GROUP BY service, app, component
ORDER BY log_entries DESC
LIMIT 100`,
        ),
        rawSql(
          "Top service instances",
          "breakdown",
          12,
          13,
          12,
          10,
          "table",
          `SELECT
  ${LOG_SERVICE} AS service,
  ${INSTANCE} AS instance,
  count() AS log_entries,
  round(sum(length(Body)) / 1048576, 2) AS message_body_mib,
  round(avg(length(Body)), 2) AS average_message_bytes,
  max(Timestamp) AS last_seen
${selectedWindow}
GROUP BY service, instance
ORDER BY log_entries DESC
LIMIT 100`,
        ),
        aggregate(
          "Log entries over time by severity",
          "breakdown",
          0,
          23,
          12,
          9,
          "stacked_bar",
          "count",
          "",
          SEVERITY,
          countFormat,
        ),
        rawSql(
          "Compressed storage by retained day (all logs)",
          "breakdown",
          12,
          23,
          12,
          9,
          "line",
          `SELECT
  toDateTime(toDate(partition)) AS ts,
  round(sum(bytes_on_disk) / 1048576, 2) AS compressed_storage_mib
FROM system.parts
WHERE active
  AND database = currentDatabase()
  AND table = 'otel_logs'
GROUP BY ts
ORDER BY ts ASC`,
          decimalFormat,
        ),
      ],
      filters: [
        {
          type: "QUERY_EXPRESSION",
          name: "Service",
          expression: LOG_SERVICE,
          whereLanguage: "sql",
          sourceId: logs,
        },
        {
          type: "QUERY_EXPRESSION",
          name: "App",
          expression: APP,
          whereLanguage: "sql",
          sourceId: logs,
        },
        {
          type: "QUERY_EXPRESSION",
          name: "Instance",
          expression: INSTANCE,
          whereLanguage: "sql",
          sourceId: logs,
        },
        {
          type: "QUERY_EXPRESSION",
          name: "Environment",
          expression: "ResourceAttributes['deployment.environment']",
          whereLanguage: "sql",
          sourceId: logs,
        },
        {
          type: "QUERY_EXPRESSION",
          name: "Severity",
          expression: SEVERITY,
          whereLanguage: "sql",
          sourceId: logs,
        },
        {
          type: "QUERY_EXPRESSION",
          name: "Component",
          expression: COMPONENT,
          whereLanguage: "sql",
          sourceId: logs,
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

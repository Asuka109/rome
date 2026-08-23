#!/usr/bin/env node
// Agent-trace dashboards for ClickStack (managed HyperDX on ClickHouse Cloud),
// managed as code. The shared apply harness (./clickstack.mjs) resolves source ids
// and applies these definitions idempotently; see it for auth, env, and the
// identity-preserving update contract.

import { applyAll, detId } from "./clickstack.mjs";

// Tag marking dashboards this module owns. Apply only ever updates/creates
// dashboards carrying it and never deletes, so a manually-made dashboard that
// happens to share a title is left untouched.
export const ownerTag = "agent-traces";

// Friendly source keys this module's tiles query (resolved per-service).
export const requiredSources = ["traces", "logs"];

// --- dashboard definitions (pure; take resolved source ids) --------------
// Grid is 24 columns. Tiles flow left-to-right and wrap, advancing by row
// height. Schema quirks of the managed API, baked into the builders below:
//   * a tile needs a top-level `name` (not only `config.name`);
//   * aggregation tiles carry their filter INSIDE `select[].where` — a
//     config-level `where` is silently dropped — while `search` tiles use a
//     column-string `select` with a config-level `where`;
//   * a ratio is two count series with `asRatio: true` (series 1 / series 2);
//   * dashboard `filters` are {type,name,expression,sourceId}; the server
//     assigns an id on create that PUT then requires (carried forward in apply).
export function buildDashboards({ traces, logs }) {
  let X = 0,
    Y = 0,
    rowH = 0,
    dash = "";
  const begin = (name) => {
    X = 0;
    Y = 0;
    rowH = 0;
    dash = name;
  };
  const pos = (w, h) => {
    if (X + w > 24) {
      X = 0;
      Y += rowH;
      rowH = 0;
    }
    const p = { x: X, y: Y, w, h };
    X += w;
    rowH = Math.max(rowH, h);
    return p;
  };
  const tileId = (name) => detId(`${dash}::${name}`);

  const agg = (name, w, h, src, displayType, opts = {}) => {
    const { aggFn = "count", valueExpression = "", level, where = "", groupBy, orderBy } = opts;
    const sel = { aggFn, valueExpression, where, whereLanguage: "sql" };
    if (level != null) sel.level = level;
    if (orderBy && /p95_ms/.test(orderBy)) sel.alias = "p95_ms";
    const config = { name, sourceId: src, displayType, select: [sel] };
    if (groupBy) config.groupBy = groupBy;
    if (orderBy) config.orderBy = orderBy;
    if (displayType === "line" || displayType === "stacked_bar") config.granularity = "auto";
    return { id: tileId(name), name, ...pos(w, h), config };
  };
  // multi-agg table: several agg series over one groupBy (each select carries
  // its own where, per the managed-API quirk above).
  const aggTable = (name, w, h, src, { selects, groupBy, orderBy }) => ({
    id: tileId(name),
    name,
    ...pos(w, h),
    config: { name, sourceId: src, displayType: "table", select: selects, groupBy, orderBy },
  });
  // ratio tile: asRatio divides series 1 (numerator) by series 2 (denominator).
  const ratio = (name, w, h, src, numWhere, denWhere) => ({
    id: tileId(name),
    name,
    ...pos(w, h),
    config: {
      name,
      sourceId: src,
      displayType: "line",
      granularity: "auto",
      asRatio: true,
      select: [
        { aggFn: "count", valueExpression: "", where: numWhere, whereLanguage: "sql" },
        { aggFn: "count", valueExpression: "", where: denWhere, whereLanguage: "sql" },
      ],
    },
  });
  const search = (name, w, h, src, select, where, orderBy) => ({
    id: tileId(name),
    name,
    ...pos(w, h),
    config: {
      name,
      sourceId: src,
      displayType: "search",
      select,
      where,
      whereLanguage: "sql",
      orderBy,
    },
  });

  // A — one conversation, scoped by a session.id dashboard filter.
  begin("Agent · Conversation Trace");
  const conversation = {
    name: "Agent · Conversation Trace",
    tags: [ownerTag],
    tiles: [
      agg("Spans in conversation", 6, 4, traces, "number"),
      agg("Agent turns", 6, 4, traces, "number", { where: "SpanName LIKE 'agent:%'" }),
      agg("Model turns", 6, 4, traces, "number", { where: "SpanName = 'model.turn'" }),
      agg("Errored spans", 6, 4, traces, "number", { where: "StatusCode = 'Error'" }),
      // Sessions active in the window — pick an id here, then scope the page
      // with the session.id filter. Only agent:* / model.turn spans carry
      // session.id, so the span counts reflect those spans.
      aggTable("Sessions in window", 24, 6, traces, {
        selects: [
          { aggFn: "count", valueExpression: "", alias: "spans" },
          { aggFn: "min", valueExpression: "Timestamp", alias: "first_seen" },
          { aggFn: "max", valueExpression: "Timestamp", alias: "last_seen" },
        ].map((s) => ({ ...s, where: "SpanAttributes['session.id'] != ''", whereLanguage: "sql" })),
        groupBy: "SpanAttributes['session.id']",
        orderBy: "last_seen DESC",
      }),
      search(
        "Conversation timeline (spans in order)",
        24,
        12,
        traces,
        "Timestamp, SpanName, Duration, StatusCode, TraceId, SpanId, ParentSpanId",
        "",
        "Timestamp ASC",
      ),
      agg("Span p95 duration over time", 12, 9, traces, "line", {
        aggFn: "quantile",
        level: 0.95,
        valueExpression: "Duration",
        groupBy: "SpanName",
      }),
      search(
        "Model turns (model.id / tools)",
        12,
        9,
        traces,
        "Timestamp, SpanAttributes['model.id'] AS model, SpanAttributes['tool_count'] AS tools, SpanAttributes['turn.id'] AS turn, Duration",
        "SpanName = 'model.turn'",
        "Timestamp ASC",
      ),
    ],
    filters: [
      // `expression` must be a BARE column: HyperDX turns the picked dropdown
      // value into `<expression> IN (...)`. A full predicate / `${var}`
      // template is never bound, so the filter would no-op and show all spans.
      {
        type: "QUERY_EXPRESSION",
        name: "session.id",
        expression: "SpanAttributes['session.id']",
        whereLanguage: "sql",
        sourceId: traces,
      },
    ],
  };

  // B — actions / hooks / routines.
  begin("Agent · Actions, Hooks & Routines");
  const span = "(SpanName LIKE 'action:%' OR SpanName LIKE 'hook:%' OR SpanName LIKE 'routine:%')";
  const actions = {
    name: "Agent · Actions, Hooks & Routines",
    tags: [ownerTag],
    tiles: [
      agg("Action / Hook / Routine volume over time", 12, 9, traces, "stacked_bar", {
        where: span,
        groupBy: "SpanName",
      }),
      // True failure rate: errored span count / total span count (asRatio).
      ratio(
        "Failure rate (errored / total)",
        12,
        9,
        traces,
        `${span} AND StatusCode = 'Error'`,
        span,
      ),
      agg("Top by volume", 12, 9, traces, "table", {
        where: span,
        groupBy: "SpanName",
        orderBy: "count() DESC",
      }),
      agg("Slowest by p95 duration (ms)", 12, 9, traces, "table", {
        aggFn: "quantile",
        level: 0.95,
        valueExpression: "Duration",
        where: span,
        groupBy: "SpanName",
        orderBy: "p95_ms DESC",
      }),
    ],
  };

  // C — errors and slow traces.
  begin("Agent · Errors & Slow Traces");
  const errors = {
    name: "Agent · Errors & Slow Traces",
    tags: [ownerTag],
    tiles: [
      agg("Error logs over time (by component)", 12, 9, logs, "stacked_bar", {
        where: "SeverityText = 'error'",
        groupBy: "LogAttributes['component']",
      }),
      agg("Errored spans over time", 12, 9, traces, "line", {
        where: "StatusCode = 'Error'",
        groupBy: "SpanName",
      }),
      search(
        "Recent error logs",
        24,
        12,
        logs,
        "Timestamp, LogAttributes['component'] AS component, LogAttributes['session.id'] AS session, Body, TraceId",
        "SeverityText = 'error'",
        "Timestamp DESC",
      ),
      search(
        "Slowest spans (drill into TraceId)",
        24,
        12,
        traces,
        "Timestamp, SpanName, Duration, SpanAttributes['session.id'] AS session, TraceId, SpanId",
        "",
        "Duration DESC",
      ),
    ],
  };

  return [conversation, actions, errors];
}

// Runnable standalone (`node agent-traces.mjs`) or via the shared entry
// (apply.mjs), which applies this module alongside the others.
if (import.meta.url === `file://${process.argv[1]}`) {
  applyAll([{ ownerTag, requiredSources, buildDashboards }]).catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}

#!/usr/bin/env node
// Chat-session audit dashboard for managed ClickStack: who created or deleted
// webchat sessions, on which instance, when. Three event sources are folded
// into one "session event" shape:
//
//   - `webchat_session_created` — the content-free audit log POST /chat/sessions
//     emits (packages/core/src/api/routes/webchat.ts).
//   - `webchat_session_deleted` — the audit log DELETE /chat/sessions/:id emits.
//   - inferred creates — history predating `webchat_session_created`: the first
//     `agent session opened` with `isNewSession=true` on a `webchat:` thread key
//     marks the session's first turn. Sessions that already have an explicit
//     created audit row are excluded so nothing double-counts.
//
// Who did it: both audit events stamp the ambient session actor
// (docs/architecture/access-control.md § Action attribution) as actorKind /
// actorUserId / actorAccountId / actorEmail attributes, so the email column
// prefers the actor's email. Only rows with no recorded actor at all (history
// predating the stamp, and inferred creates) fall back to the channel-email
// component's "guardian email resolved from Rome Cloud" mapping, joined on
// (environment, instance slug) — unwindowed, because the mapping accrues over
// all history. A
// recorded but email-less actor (anonymous, password-only guardian seat) keeps
// an empty email: filling in the instance guardian's email there would falsely
// attribute the operation.

import { applyAll, detId } from "./clickstack.mjs";

export const ownerTag = "chat-session-audit";
export const requiredSources = ["logs"];

const INST =
  "if(empty(ResourceAttributes['service.instance.id']), 'unknown', ResourceAttributes['service.instance.id'])";

// (environment, instance slug) -> latest guardian email seen in telemetry
// (see header). Pinned to the exact core channel-email resolution event — a
// bare guardianEmail attribute is NOT authoritative (any rome_app log could
// carry one and poison the audit fallback) — and keyed by environment plus a
// non-'unknown' instance: all dev worktrees share service.instance.id
// 'unknown' (docs/observability/schema.md), so a mapping there would let one
// worktree's guardian claim every worktree's unattributed events.
const EMAIL_MAP = `email_map AS (
  SELECT env, inst, argMax(email, seen) AS email
  FROM (
    SELECT
      ResourceAttributes['deployment.environment'] AS env,
      ${INST} AS inst,
      LogAttributes['guardianEmail'] AS email,
      max(Timestamp) AS seen
    FROM $__sourceTable
    WHERE ServiceName = 'rome'
      AND Body = 'guardian email resolved from Rome Cloud'
      AND LogAttributes['component'] = 'channel-email'
      AND LogAttributes['guardianEmail'] != ''
      AND ${INST} != 'unknown'
    GROUP BY env, inst, email
  )
  GROUP BY env, inst
)`;

// The actor's stable id: guardian actors stamp actorUserId (canonical seat
// id), visitor actors stamp only actorAccountId.
const ACTOR_ID =
  "if(LogAttributes['actorUserId'] != '', LogAttributes['actorUserId'], LogAttributes['actorAccountId'])";

// One row per create/delete event inside the dashboard window. Column order is
// shared by every UNION ALL branch: ts, inst, env, action, source, session_id,
// agent, project, detail, actor_kind, actor_id, actor_email.
const EVENTS = `events AS (
  SELECT
    Timestamp AS ts,
    ${INST} AS inst,
    ResourceAttributes['deployment.environment'] AS env,
    'create' AS action,
    'audit-log' AS source,
    LogAttributes['sessionId'] AS session_id,
    LogAttributes['agentName'] AS agent,
    LogAttributes['projectPath'] AS project,
    concat('model=', LogAttributes['largeModelSelection']) AS detail,
    LogAttributes['actorKind'] AS actor_kind,
    ${ACTOR_ID} AS actor_id,
    LogAttributes['actorEmail'] AS actor_email
  FROM $__sourceTable
  WHERE $__timeFilter_ms(Timestamp)
    AND $__filters
    AND Body = 'webchat_session_created'
  UNION ALL
  SELECT
    Timestamp,
    ${INST},
    ResourceAttributes['deployment.environment'],
    'delete',
    'audit-log',
    LogAttributes['sessionId'],
    LogAttributes['agentName'],
    LogAttributes['projectPath'],
    concat(
      'was_archived=', LogAttributes['wasArchived'],
      ' live_agent_session=', LogAttributes['hadLiveAgentSession'],
      ' reason=', LogAttributes['reason']),
    LogAttributes['actorKind'],
    ${ACTOR_ID},
    LogAttributes['actorEmail']
  FROM $__sourceTable
  WHERE $__timeFilter_ms(Timestamp)
    AND $__filters
    AND Body = 'webchat_session_deleted'
  UNION ALL
  SELECT
    min(Timestamp),
    inst,
    argMin(env, Timestamp),
    'create',
    'inferred-first-turn',
    session_id,
    argMin(agent, Timestamp),
    '',
    '',
    '',
    '',
    ''
  FROM (
    SELECT
      Timestamp,
      ${INST} AS inst,
      ResourceAttributes['deployment.environment'] AS env,
      splitByChar(':', LogAttributes['channelThreadKey'])[2] AS session_id,
      LogAttributes['agentName'] AS agent
    FROM $__sourceTable
    WHERE $__timeFilter_ms(Timestamp)
      AND $__filters
      AND Body = 'agent session opened'
      AND LogAttributes['isNewSession'] = 'true'
      AND startsWith(LogAttributes['channelThreadKey'], 'webchat:')
  )
  WHERE session_id NOT IN (
    SELECT LogAttributes['sessionId'] FROM $__sourceTable WHERE Body = 'webchat_session_created'
  )
  GROUP BY inst, session_id
)`;

const countFormat = { output: "number", mantissa: 0, thousandSeparated: true };

export function buildDashboards({ logs, logsConnection }) {
  const dashboardName = "Rome · Chat Session Audit";
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

  const countSql = (predicate) => `
WITH ${EVENTS}
SELECT count() AS events
FROM events
WHERE ${predicate}
LIMIT 1`;

  const dailyTrendSql = `
WITH ${EVENTS}
SELECT
  toStartOfDay(ts, 'UTC') AS day_utc,
  action,
  count() AS events
FROM events
GROUP BY day_utc, action
ORDER BY day_utc ASC, action ASC
LIMIT 10000`;

  const byInstanceSql = `
WITH ${EMAIL_MAP},
${EVENTS}
SELECT
  e.inst AS instance_id,
  m.email AS email,
  countIf(e.action = 'create') AS creates,
  countIf(e.action = 'delete') AS deletes,
  max(e.ts) AS last_event
FROM events AS e
LEFT JOIN email_map AS m ON e.inst = m.inst AND e.env = m.env
GROUP BY instance_id, email
ORDER BY creates + deletes DESC
LIMIT 500`;

  const byActorSql = `
WITH ${EVENTS}
SELECT
  if(actor_kind = '', 'unrecorded', actor_kind) AS actor_kind,
  actor_id,
  actor_email,
  uniqExact(inst) AS instances,
  countIf(action = 'create') AS creates,
  countIf(action = 'delete') AS deletes,
  max(ts) AS last_event
FROM events
GROUP BY actor_kind, actor_id, actor_email
ORDER BY creates + deletes DESC
LIMIT 500`;

  const detailSql = `
WITH ${EMAIL_MAP},
${EVENTS}
SELECT
  e.ts AS ts,
  e.inst AS instance_id,
  if(e.actor_email != '', e.actor_email, if(e.actor_kind = '', m.email, '')) AS email,
  e.action AS action,
  e.actor_kind AS actor_kind,
  e.actor_id AS actor_id,
  e.session_id AS session_id,
  e.agent AS agent,
  e.project AS project,
  e.source AS source,
  e.detail AS detail
FROM events AS e
LEFT JOIN email_map AS m ON e.inst = m.inst AND e.env = m.env
ORDER BY ts DESC
LIMIT 2000`;

  return [
    {
      name: dashboardName,
      tags: [ownerTag],
      containers: [
        { id: "overview", title: "Overview", collapsed: false },
        { id: "trends", title: "Daily trend (UTC)", collapsed: false },
        { id: "detail", title: "Session events", collapsed: false },
      ],
      tiles: [
        rawSql(
          "Chat sessions created",
          "overview",
          0,
          0,
          6,
          4,
          "number",
          countSql("action = 'create'"),
          countFormat,
        ),
        rawSql(
          "Chat sessions deleted",
          "overview",
          6,
          0,
          6,
          4,
          "number",
          countSql("action = 'delete'"),
          countFormat,
        ),
        rawSql(
          "Instances with session activity",
          "overview",
          12,
          0,
          6,
          4,
          "number",
          `
WITH ${EVENTS}
SELECT uniqExact(inst) AS instances
FROM events
LIMIT 1`,
          countFormat,
        ),
        rawSql(
          "Creates from the audit log",
          "overview",
          18,
          0,
          6,
          4,
          "number",
          countSql("action = 'create' AND source = 'audit-log'"),
          countFormat,
        ),
        rawSql(
          "Daily creates & deletes",
          "trends",
          0,
          4,
          24,
          9,
          "stacked_bar",
          dailyTrendSql,
          countFormat,
        ),
        rawSql("Session events by instance", "detail", 0, 13, 12, 8, "table", byInstanceSql),
        rawSql("Session events by actor", "detail", 12, 13, 12, 8, "table", byActorSql),
        rawSql("Session audit log — detail", "detail", 0, 21, 24, 12, "table", detailSql),
      ],
      filters: [
        {
          type: "QUERY_EXPRESSION",
          name: "Guardian instance",
          expression: INST,
          whereLanguage: "sql",
          sourceId: logs,
        },
        // Actor filters match only rows that carry the stamped attributes —
        // selecting a value naturally excludes inferred/pre-actor history.
        {
          type: "QUERY_EXPRESSION",
          name: "Actor email",
          expression: "LogAttributes['actorEmail']",
          whereLanguage: "sql",
          sourceId: logs,
        },
        {
          type: "QUERY_EXPRESSION",
          name: "Actor kind",
          expression: "LogAttributes['actorKind']",
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

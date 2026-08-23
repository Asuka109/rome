# ClickStack dashboards (as code)

ClickStack dashboards defined in code and applied to a service idempotently.
Each `*.mjs` module here is a dashboard set — the file is the source of truth;
edit it and re-apply. [`apply.mjs`](apply.mjs) applies every module in one pass
(shared source resolution), and the shared harness [`clickstack.mjs`](clickstack.mjs)
holds the auth + update logic.

| Module | Owner tag | Dashboards |
|---|---|---|
| [`agent-traces.mjs`](agent-traces.mjs) | `agent-traces` | **Agent · Conversation Trace** (sessions active in the window, one conversation scoped by a `session.id` filter), **Agent · Actions, Hooks & Routines** (volume / failure-rate / slowest), **Agent · Errors & Slow Traces**. |
| [`chat-session-audit.mjs`](chat-session-audit.mjs) | `chat-session-audit` | **Rome · Chat Session Audit** — webchat session create/delete events with the stamped [session actor](../../../docs/concepts/actions.md#actor) (kind, user/account id, email), daily create/delete trend, per-instance and per-actor rollups, and the detailed audit-log table (instance id, email, action, actor, session id). Creates predating the `webchat_session_created` audit log are inferred from the first `agent session opened` on a `webchat:` thread; pre-actor rows fall back to the channel-email guardian-email mapping. |
| [`guardian-usage.mjs`](guardian-usage.mjs) | `guardian-usage` | **Rome · Guardian Usage** — UTC daily token and estimated-dollar usage by Rome Cloud guardian account, account rankings, token-category detail, and recent model turns. |
| [`log-volume-storage.mjs`](log-volume-storage.mjs) | `log-volume-storage` | **Rome · Log Volume & Storage** — selected-window log counts and message bytes, trends split between the Rome platform and Rome apps (with retained-data fallback classification), volume attribution by app/component/instance, severity, and retained compressed storage. |

The span/log shapes these query are documented in
[`../../../docs/observability/schema.md`](../../../docs/observability/schema.md).

## Apply

Managed ClickStack folds its dashboard API into the ClickHouse Cloud OpenAPI,
authenticated with a **ClickHouse Cloud API key** (Org or Service Admin) over
HTTP Basic — there is no separate HyperDX token on managed ClickStack. Trace/log
source ids are discovered per-service, so the same definitions apply to any
service without edits.

```bash
export CH_KEY_ID=...        # ClickHouse Cloud API key id     (secret — never commit)
export CH_KEY_SECRET=...    # ClickHouse Cloud API key secret (secret — never commit)
export CH_ORG=...           # organization id
export CH_SVC=...           # service id
pnpm obs:dashboards         # → node infra/observability/dashboards/apply.mjs (all modules)
```

`DRY_RUN=1 pnpm obs:dashboards` prints the dashboard JSON (with placeholder
source ids) instead of applying — useful for review or diffing in CI. Each
module is also runnable standalone (e.g. `node infra/observability/dashboards/agent-traces.mjs`).

## Add a dashboard set

1. Create `infra/observability/dashboards/<name>.mjs` exporting `ownerTag` (a
   unique tag this module owns), `requiredSources` (subset of `traces`, `logs`,
   `metrics`, `sessions`), and `buildDashboards(sources)` returning an array of
   dashboard objects. Mirror an existing module's builder helpers.
2. Import it in [`apply.mjs`](apply.mjs) and add it to the `applyAll([...])` list.

## Notes

- **Idempotent and identity-preserving**: an existing dashboard is updated in
  place (`PUT`), so its id stays stable across runs. The server owns tile and
  filter ids, so apply carries the existing ones forward (matched by name) —
  anything keyed to them (alerts, deep links) survives. The deterministic ids in
  the definition exist only to make `DRY_RUN` output reproducible.
- **Ownership-scoped, never destructive**: apply only matches dashboards
  carrying a module's `ownerTag` and never deletes — a manually-created
  dashboard that happens to share a title is left untouched.
- **No Terraform yet**: a ClickStack Terraform provider is in development but has
  no dashboard resource. The Cloud OpenAPI (this script) is the supported
  as-code path today.
- **The UI "import JSON" is not an API** — it is `POST /dashboards` plus a manual
  source-id remap. This script does the remap automatically (`GET /sources`).
- Managed-API schema quirks (handled in the builders): a tile needs a top-level
  `name`; aggregation tiles carry their filter inside `select[].where` (a
  config-level `where` is dropped); `search` tiles use a column-string `select`
  with a config-level `where`; a line or table tile may carry several agg
  selects (e.g. p50/p95/p99, or count/min/max over one `groupBy`), each with
  its own `where`; a ratio is two count series with
  `asRatio: true`; `PUT` requires each dashboard filter to keep its
  server-assigned id.

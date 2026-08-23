import assert from "node:assert/strict";
import test from "node:test";
import { buildDashboards, ownerTag, requiredSources } from "./chat-session-audit.mjs";

test("builds the chat session audit dashboard over the three event sources", () => {
  const [dashboard] = buildDashboards({ logs: "logs-source", logsConnection: "logs-connection" });

  assert.equal(ownerTag, "chat-session-audit");
  assert.deepEqual(requiredSources, ["logs"]);
  assert.equal(dashboard.name, "Rome · Chat Session Audit");
  assert.deepEqual(dashboard.tags, [ownerTag]);
  assert.equal(dashboard.tiles.length, 8);
  assert.deepEqual(
    dashboard.filters.map((filter) => filter.name),
    ["Guardian instance", "Actor email", "Actor kind", "Environment"],
  );
  assert.ok(dashboard.filters.every((filter) => filter.sourceId === "logs-source"));

  for (const tile of dashboard.tiles) {
    assert.equal(tile.config.sourceId, "logs-source");
    assert.equal(tile.config.connectionId, "logs-connection");
    assert.match(tile.config.sqlTemplate, /\$__timeFilter_ms\(Timestamp\)/);
    assert.match(tile.config.sqlTemplate, /\$__filters/);
  }

  // Every event tile folds the explicit audit rows and the inferred first-turn
  // creates together, and the inferred branch must exclude sessions that
  // already have an explicit created row (no double-counting).
  const eventTiles = dashboard.tiles.filter((tile) =>
    tile.config.sqlTemplate.includes("events AS ("),
  );
  assert.equal(eventTiles.length, dashboard.tiles.length);
  for (const tile of eventTiles) {
    assert.match(tile.config.sqlTemplate, /webchat_session_created/);
    assert.match(tile.config.sqlTemplate, /webchat_session_deleted/);
    assert.match(tile.config.sqlTemplate, /agent session opened/);
    assert.match(tile.config.sqlTemplate, /session_id NOT IN/);
  }

  // The user-facing tables carry the required columns: instance id, email,
  // action, plus the stamped session actor (kind, id, email). The email
  // column prefers the actor's email; the channel-email-map fallback is gated
  // on no actor being recorded at all (actor_kind = ''), so an anonymous or
  // email-less guardian event is never misattributed to the instance
  // guardian's mapped email.
  const detail = dashboard.tiles.find((tile) => tile.name === "Session audit log — detail");
  for (const column of [
    "instance_id",
    "email",
    "action",
    "actor_kind",
    "actor_id",
    "session_id",
    "agent",
    "source",
  ]) {
    assert.match(detail.config.sqlTemplate, new RegExp(`AS ${column}`));
  }
  assert.match(detail.config.sqlTemplate, /email_map/);
  assert.match(
    detail.config.sqlTemplate,
    /if\(e\.actor_email != '', e\.actor_email, if\(e\.actor_kind = '', m\.email, ''\)\)/,
  );

  // The fallback mapping is only authoritative when pinned to the exact core
  // channel-email resolution event and scoped to (environment, non-'unknown'
  // instance) — a bare guardianEmail attribute from an app log, or the shared
  // dev 'unknown' instance id, must never feed the audit email column.
  const emailMapTiles = dashboard.tiles.filter((tile) =>
    tile.config.sqlTemplate.includes("email_map"),
  );
  assert.equal(emailMapTiles.length, 2);
  for (const tile of emailMapTiles) {
    assert.match(tile.config.sqlTemplate, /ServiceName = 'rome'/);
    assert.match(tile.config.sqlTemplate, /Body = 'guardian email resolved from Rome Cloud'/);
    assert.match(tile.config.sqlTemplate, /LogAttributes\['component'\] = 'channel-email'/);
    assert.match(tile.config.sqlTemplate, /!= 'unknown'/);
    assert.match(tile.config.sqlTemplate, /ON e\.inst = m\.inst AND e\.env = m\.env/);
  }

  const byInstance = dashboard.tiles.find((tile) => tile.name === "Session events by instance");
  assert.match(byInstance.config.sqlTemplate, /AS creates/);
  assert.match(byInstance.config.sqlTemplate, /AS deletes/);

  const byActor = dashboard.tiles.find((tile) => tile.name === "Session events by actor");
  assert.match(byActor.config.sqlTemplate, /actor_kind/);
  assert.match(byActor.config.sqlTemplate, /'unrecorded'/);

  const trend = dashboard.tiles.find((tile) => tile.name === "Daily creates & deletes");
  assert.equal(trend.config.displayType, "stacked_bar");
  assert.equal(trend.config.fillNulls, true);
});

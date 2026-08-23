import assert from "node:assert/strict";
import test from "node:test";
import { buildDashboards, ownerTag, requiredSources } from "./log-volume-storage.mjs";

test("builds a filterable log volume and storage dashboard", () => {
  const [dashboard] = buildDashboards({ logs: "logs-source", logsConnection: "logs-connection" });

  assert.equal(ownerTag, "log-volume-storage");
  assert.deepEqual(requiredSources, ["logs"]);
  assert.equal(dashboard.name, "Rome · Log Volume & Storage");
  assert.deepEqual(dashboard.tags, [ownerTag]);
  assert.equal(dashboard.tiles.length, 10);
  assert.deepEqual(
    dashboard.filters.map((filter) => filter.name),
    ["Service", "App", "Instance", "Environment", "Severity", "Component"],
  );
  assert.ok(dashboard.filters.every((filter) => filter.sourceId === "logs-source"));

  const selectedWindowTiles = dashboard.tiles.filter((tile) =>
    tile.config.sqlTemplate?.includes("$__sourceTable"),
  );
  assert.equal(selectedWindowTiles.length, 5);
  for (const tile of selectedWindowTiles) {
    assert.match(tile.config.sqlTemplate, /\$__timeFilter_ms\(Timestamp\)/);
    assert.match(tile.config.sqlTemplate, /\$__filters/);
  }

  const serviceTrendTiles = dashboard.tiles.filter((tile) =>
    tile.name.endsWith("over time by service"),
  );
  assert.equal(serviceTrendTiles.length, 2);
  for (const tile of serviceTrendTiles) {
    assert.match(tile.config.groupBy, /rome\.log\.source/);
    assert.match(tile.config.groupBy, /rome-apps/);
    assert.match(tile.config.groupBy, /app-api/);
  }

  const topComponents = dashboard.tiles.find((tile) => tile.name === "Top components");
  assert.match(topComponents.config.sqlTemplate, /AS service/);
  assert.match(topComponents.config.sqlTemplate, /AS app/);
  assert.match(topComponents.config.sqlTemplate, /rome\.app\.id/);

  const physicalStorageTiles = dashboard.tiles.filter((tile) =>
    tile.config.sqlTemplate?.includes("system.parts"),
  );
  assert.equal(physicalStorageTiles.length, 2);
  assert.ok(
    physicalStorageTiles.every(
      (tile) => tile.name.includes("all retained logs") || tile.name.includes("all logs"),
    ),
  );
});

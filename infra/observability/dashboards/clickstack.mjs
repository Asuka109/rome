#!/usr/bin/env node
// Shared apply harness for the as-code ClickStack dashboards. Each dashboard
// module (agent-traces.mjs, guardian-usage.mjs, …) exports `ownerTag`,
// `requiredSources`, and `buildDashboards(sources)`; this harness resolves the
// per-service source ids once and applies every module against them.
//
// Applying is idempotent and identity-preserving: each dashboard is updated in
// place (PUT) so its id, tile ids, and filter ids stay stable across runs —
// anything keyed to them (alerts, deep links) survives. Apply only ever
// updates/creates dashboards carrying a module's `ownerTag` and never deletes,
// so a manually-made dashboard that happens to share a title is left untouched.
//
// Why the Cloud OpenAPI and not Terraform: a ClickStack Terraform provider is
// still in development and has no dashboard resource yet; the Cloud OpenAPI
// (folded-in ClickStack routes) is the supported as-code path today. The UI
// "import JSON" feature has no API — it is just POST /dashboards plus a manual
// source-id remap, which this harness does automatically via GET /sources.
//
// Auth: a ClickHouse Cloud API key (Org or Service Admin) over HTTP Basic — the
// same key authorizes the ClickStack routes; no separate HyperDX token exists
// on managed ClickStack. Credentials and target come from the environment:
//
//   CH_KEY_ID, CH_KEY_SECRET   ClickHouse Cloud API key (never commit these)
//   CH_ORG, CH_SVC             organization id, service id
//   DRY_RUN=1                  print the dashboard JSON instead of applying
//
// Source ids are discovered per-service, so the same definitions apply to any
// service (dev/prod) without edits.

import { createHash } from "node:crypto";

// Stable id derived from a seed (dashboard + tile name) so tile identity is
// preserved across applies and DRY_RUN output is reproducible.
export const detId = (seed) => {
  const h = createHash("sha1").update(seed).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
};

// Friendly (plural) source keys passed to every buildDashboards(); each module
// declares the subset it needs in `requiredSources`.
const SOURCE_KINDS = { traces: "trace", logs: "log", metrics: "metric", sessions: "session" };

// Placeholder source and connection ids so raw-SQL dashboards are reviewable
// offline without credentials too.
const placeholderSources = Object.fromEntries(
  Object.keys(SOURCE_KINDS).flatMap((key) => [
    [key, `<${key}>`],
    [`${key}Connection`, `<${key}-connection>`],
  ]),
);

export async function applyAll(modules) {
  const { CH_KEY_ID, CH_KEY_SECRET, CH_ORG, CH_SVC, DRY_RUN } = process.env;

  if (DRY_RUN) {
    const out = modules.flatMap((m) => m.buildDashboards(placeholderSources));
    console.log(JSON.stringify(out, null, 2));
    return;
  }
  if (!CH_KEY_ID || !CH_KEY_SECRET || !CH_ORG || !CH_SVC) {
    console.error("Set CH_KEY_ID, CH_KEY_SECRET, CH_ORG, CH_SVC (or DRY_RUN=1).");
    process.exit(1);
  }

  const BASE = `https://api.clickhouse.cloud/v1/organizations/${CH_ORG}/services/${CH_SVC}/clickstack`;
  const H = {
    "Content-Type": "application/json",
    Authorization: "Basic " + Buffer.from(`${CH_KEY_ID}:${CH_KEY_SECRET}`).toString("base64"),
  };
  const api = async (path, opts = {}) => {
    const r = await fetch(BASE + path, { headers: H, ...opts });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || j.error)
      throw new Error(`${opts.method || "GET"} ${path} -> ${r.status}: ${j.error || ""}`);
    return j.result;
  };

  const srcs = await api("/sources");
  const sources = Object.fromEntries(
    Object.entries(SOURCE_KINDS).flatMap(([key, kind]) => {
      const source = srcs.find((candidate) => candidate.kind === kind);
      return [
        [key, source?.id],
        [`${key}Connection`, source?.connection],
      ];
    }),
  );
  console.log(
    `sources: ${Object.entries(sources)
      .filter(([, v]) => v)
      .map(([k, v]) => `${k}=${v}`)
      .join(" ")}`,
  );

  const allDashboards = await api("/dashboards");
  for (const m of modules) {
    const missing = (m.requiredSources || []).filter((k) => !sources[k]);
    if (missing.length) throw new Error(`[${m.ownerTag}] missing source(s): ${missing.join(", ")}`);

    // Only consider dashboards this module owns (by tag), so a title collision
    // with a manual dashboard never causes us to touch it.
    const owned = allDashboards.filter((e) => (e.tags || []).includes(m.ownerTag));
    for (const d of m.buildDashboards(sources)) {
      const prior = owned.find((e) => e.name === d.name);
      if (prior) {
        // Update in place to preserve identity. The server owns tile/filter ids
        // (it ignores client-supplied ones and re-mints any it doesn't recognize),
        // so carry the existing ids forward, matched by name: tiles keep their id,
        // and PUT-required filter ids are reused. New tiles (no name match) get a
        // fresh server id; the deterministic id in the definition is only ever
        // surfaced by DRY_RUN.
        const priorTileId = new Map((prior.tiles || []).map((t) => [t.name, t.id]));
        const body = {
          name: d.name,
          tags: d.tags,
          tiles: d.tiles.map((t) => ({ ...t, id: priorTileId.get(t.name) ?? t.id })),
          containers: d.containers ?? prior.containers ?? [],
          filters: (d.filters || []).map((f) => {
            const ex = (prior.filters || []).find((pf) => pf.name === f.name);
            // PUT requires an id on every filter. A filter added to an existing
            // dashboard has no prior id to carry forward, so mint a
            // deterministic one (as tile builders do) for the server to adopt
            // or re-mint.
            return { ...f, id: ex?.id ?? detId(`${d.name}::filter::${f.name}`) };
          }),
          savedQuery: prior.savedQuery ?? null,
          savedQueryLanguage: prior.savedQueryLanguage ?? null,
          savedFilterValues: prior.savedFilterValues ?? [],
        };
        await api(`/dashboards/${prior.id}`, { method: "PUT", body: JSON.stringify(body) });
        console.log(`  ✓ updated ${d.name}  (${d.tiles.length} tiles)  id=${prior.id}`);
      } else {
        const r = await api("/dashboards", { method: "POST", body: JSON.stringify(d) });
        console.log(`  ✓ created ${d.name}  (${d.tiles.length} tiles)  id=${r.id}`);
      }
    }
  }
  console.log("Done.");
}

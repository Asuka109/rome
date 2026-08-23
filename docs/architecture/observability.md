# Observability

How a Rome [instance](../concepts/deployment.md#instances) emits telemetry, how it reaches a central store, and what shape consumers can rely on. Telemetry is shaped the same way in dev and prod. Only the ClickHouse target differs.

## Pipeline

```
Rome instance ──OTLP──► OTEL Collector ──► ClickHouse ──► consumers (HyperDX, SQL helpers)
```

The collector is a separate container (image `otel/opentelemetry-collector-contrib`) co-located with Rome — in `docker-compose.yml` for prod, in `infra/observability/compose.yml` for dev. It runs the same config in both environments. The only environment-specific input is the ClickHouse target.

Operators supply that target via a dedicated `.env.collector` file (sibling of `docker-compose.yml` in prod, worktree root in dev). The Rome container reads the shared `.env`. The collector reads only `.env.collector`. The split is the boundary — there is no compose path that forwards `CLICKHOUSE_*` into Rome.

The dev `rome-obs` Compose project also includes a HyperDX-local bundle (Collector + ClickHouse + UI) on the same network. It is not the default ingress — it stays available as a fallback target if a developer overrides `OTEL_EXPORTER_OTLP_ENDPOINT` to `rome-obs:4318` to query telemetry without going through the central stack.

## Rome Cloud control plane

The Rome Cloud control plane and its PM2/collector deployment are owned by the
private [`amantru/rome-cloud`](https://github.com/amantru/rome-cloud) repository.
Rome instance telemetry is defined here. Cloud telemetry configuration and
dashboards evolve with the control-plane deployment.

## Required attributes

Every signal carries:

| Attribute | Source | Purpose |
|---|---|---|
| `service.name` | constant `"rome"` | Identifies the emitter. |
| `service.instance.id` | `PANTHEON_SLUG` | Identifies *which* Rome process. |
| `deployment.environment` | derived from `NODE_ENV` | Distinguishes dev / prod streams. |

Together, these three identify what emitted the signal and where it ran.

## Invariants

- **Logical isolation, not physical.** All instances write to the same ClickHouse tables. `service.instance.id` is the telemetry isolation boundary. A query that does not filter on it sees every instance. The helper in `@rome-os/app-runtime` injects the filter automatically so app code cannot accidentally read another instance's data.
- **Profile vs instance isolation.** Profile is the *data* isolation boundary. Instance is the *telemetry* isolation boundary — deliberately distinct (see [`process.md`](process.md)).
- **Rome never blocks on the obs stack.** OTLP export is fire-and-forget. Export failures are non-events. A degraded or absent observability stack must not affect Rome's behaviour on the request path.
- **ClickHouse credentials live on the collector, not on Rome.** The Rome backend speaks plain OTLP to a sidecar that it reaches by service name. Only the collector container reads `CLICKHOUSE_*` env vars (via its own `.env.collector`, never the shared `.env`). This keeps the storage target swappable (HyperDX-local, ClickStack Cloud, self-hosted ClickHouse) without changing Rome's runtime config or rebuilding the image. A compromise of Rome's process also does not yield write access to the central observability store.
- **Collector startup is fail-closed.** The ClickHouse exporter validates its target at boot by creating the OTEL tables. Missing or unreachable credentials crash-loop the collector container rather than silently dropping data. A running collector means the storage path is wired end-to-end.

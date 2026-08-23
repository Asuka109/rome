#!/usr/bin/env bash
set -euo pipefail

IMAGE_TAG="${BENCH_IMAGE_TAG:-rome:benchmark}"
DOCKERFILE="${BENCH_DOCKERFILE:-Dockerfile}"
CONTEXT="${BENCH_CONTEXT:-.docker/rome-runtime-workspace}"
OUTPUT_DIR="${BENCH_OUTPUT_DIR:-metrics}"
BOOT_TIMEOUT_SEC="${BENCH_BOOT_TIMEOUT_SEC:-180}"
REQUIRE_HEALTHY="${BENCH_REQUIRE_HEALTHY:-true}"

mkdir -p "$OUTPUT_DIR"

timestamp_utc="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
timestamp_file="$(date -u +"%Y%m%dT%H%M%SZ")"
git_sha="$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")"
run_id="${GITHUB_RUN_ID:-local}"
runner_name="${RUNNER_NAME:-local}"

json_latest_path="${OUTPUT_DIR}/docker-benchmark-latest.json"
json_timestamped_path="${OUTPUT_DIR}/docker-benchmark-${timestamp_file}.json"
csv_latest_path="${OUTPUT_DIR}/docker-benchmark-latest.csv"
csv_history_path="${OUTPUT_DIR}/docker-benchmark-history.csv"
log_path="${OUTPUT_DIR}/docker-benchmark-${timestamp_file}.log"

container_name="rome-benchmark-${run_id}-${RANDOM}"

cleanup() {
  docker rm -f "$container_name" >/dev/null 2>&1 || true
}
trap cleanup EXIT

echo "==> Building Docker image: ${IMAGE_TAG}"
if [[ "$CONTEXT" == ".docker/rome-runtime-workspace" ]]; then
  node scripts/docker/prepare-runtime-workspace.mjs
fi
build_started_epoch="$(date +%s)"
docker build --file "$DOCKERFILE" --tag "$IMAGE_TAG" "$CONTEXT"
build_finished_epoch="$(date +%s)"
build_time_sec="$((build_finished_epoch - build_started_epoch))"

image_size_bytes="$(docker image inspect "$IMAGE_TAG" --format '{{.Size}}')"
image_size_mb="$(awk "BEGIN { printf \"%.2f\", ${image_size_bytes} / 1024 / 1024 }")"

echo "==> Measuring boot-to-health time"
docker run -d --name "$container_name" \
  -e NODE_ENV=production \
  -e WEB_HOST=0.0.0.0 \
  "$IMAGE_TAG" >/dev/null

boot_started_epoch="$(date +%s)"
boot_status="timeout"
for ((i = 0; i < BOOT_TIMEOUT_SEC; i++)); do
  if docker exec "$container_name" node -e "fetch('http://localhost:4141/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))" >/dev/null 2>&1; then
    boot_status="healthy"
    break
  fi

  running="$(docker inspect --format '{{.State.Running}}' "$container_name" 2>/dev/null || echo "false")"
  if [[ "$running" != "true" ]]; then
    boot_status="exited"
    break
  fi

  sleep 1
done
boot_finished_epoch="$(date +%s)"
boot_time_sec="$((boot_finished_epoch - boot_started_epoch))"

docker logs --tail 250 "$container_name" >"$log_path" 2>&1 || true

cat >"$json_latest_path" <<EOF
{
  "timestamp_utc": "${timestamp_utc}",
  "git_sha": "${git_sha}",
  "runner": "${runner_name}",
  "image_tag": "${IMAGE_TAG}",
  "image_size_bytes": ${image_size_bytes},
  "image_size_mb": "${image_size_mb}",
  "build_time_sec": ${build_time_sec},
  "boot_time_sec": ${boot_time_sec},
  "boot_status": "${boot_status}",
  "boot_timeout_sec": ${BOOT_TIMEOUT_SEC}
}
EOF

cp "$json_latest_path" "$json_timestamped_path"

csv_header="timestamp_utc,git_sha,runner,image_tag,image_size_bytes,image_size_mb,build_time_sec,boot_time_sec,boot_status,boot_timeout_sec"
csv_row="${timestamp_utc},${git_sha},${runner_name},${IMAGE_TAG},${image_size_bytes},${image_size_mb},${build_time_sec},${boot_time_sec},${boot_status},${BOOT_TIMEOUT_SEC}"

{
  echo "$csv_header"
  echo "$csv_row"
} >"$csv_latest_path"

if [[ ! -f "$csv_history_path" ]]; then
  echo "$csv_header" >"$csv_history_path"
fi
echo "$csv_row" >>"$csv_history_path"

echo "timestamp_utc=${timestamp_utc}"
echo "git_sha=${git_sha}"
echo "image_size_bytes=${image_size_bytes}"
echo "image_size_mb=${image_size_mb}"
echo "build_time_sec=${build_time_sec}"
echo "boot_time_sec=${boot_time_sec}"
echo "boot_status=${boot_status}"
echo "metrics_json=${json_latest_path}"
echo "metrics_csv=${csv_latest_path}"
echo "metrics_log=${log_path}"

if [[ -n "${GITHUB_OUTPUT:-}" ]]; then
  {
    echo "timestamp_utc=${timestamp_utc}"
    echo "git_sha=${git_sha}"
    echo "image_size_bytes=${image_size_bytes}"
    echo "image_size_mb=${image_size_mb}"
    echo "build_time_sec=${build_time_sec}"
    echo "boot_time_sec=${boot_time_sec}"
    echo "boot_status=${boot_status}"
    echo "metrics_json=${json_latest_path}"
    echo "metrics_csv=${csv_latest_path}"
    echo "metrics_log=${log_path}"
  } >>"$GITHUB_OUTPUT"
fi

if [[ "$REQUIRE_HEALTHY" == "true" && "$boot_status" != "healthy" ]]; then
  echo "Container did not become healthy (status=${boot_status}) within ${BOOT_TIMEOUT_SEC}s." >&2
  exit 1
fi

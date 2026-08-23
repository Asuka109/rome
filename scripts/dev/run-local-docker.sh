#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage: scripts/dev/run-local-docker.sh [options]

Build the current Rome checkout into a local Docker image and launch a fresh
container on a non-default host port.

Options:
  --name NAME          Container name (default: rome-dev)
  --port PORT          Host port to bind to container port 8080 (default: 8081)
  --image TAG          Local image tag to build/run (default: rome-local:latest)
  --container-port N   Container port exposed by the image (default: 8080)
  --env-file PATH      Env file to pass to docker run if it exists (default: .env,
                       seeded from packages/core/.env.example when absent)
  --no-build           Skip docker build and run the existing image tag
  -h, --help           Show this help

Environment overrides:
  ROME_DOCKER_CONTAINER_NAME
  ROME_DOCKER_HOST_PORT
  ROME_DOCKER_IMAGE_TAG
  ROME_DOCKER_CONTAINER_PORT
  ROME_DOCKER_ENV_FILE
  ROME_APT_MIRROR        Bare host to replace deb.debian.org during build,
                         e.g. mirrors.tuna.tsinghua.edu.cn (fixes apt 502s on
                         flaky/proxied networks). Unset = official Debian source.
  ROME_NPM_REGISTRY      Full npm registry URL for build-time installs,
                         e.g. https://registry.npmmirror.com. Unset = npm default.
EOF
}

repo_root="$(git rev-parse --show-toplevel)"
cd "$repo_root"

container_name="${ROME_DOCKER_CONTAINER_NAME:-rome-dev}"
host_port="${ROME_DOCKER_HOST_PORT:-8081}"
image_tag="${ROME_DOCKER_IMAGE_TAG:-rome-local:latest}"
container_port="${ROME_DOCKER_CONTAINER_PORT:-8080}"
env_file="${ROME_DOCKER_ENV_FILE:-.env}"
env_file_from_default="true"
if [[ -n "${ROME_DOCKER_ENV_FILE:-}" ]]; then
  env_file_from_default="false"
fi
build_image="true"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --name)
      container_name="${2:?--name requires a value}"
      shift 2
      ;;
    --port)
      host_port="${2:?--port requires a value}"
      shift 2
      ;;
    --image)
      image_tag="${2:?--image requires a value}"
      shift 2
      ;;
    --container-port)
      container_port="${2:?--container-port requires a value}"
      shift 2
      ;;
    --env-file)
      env_file="${2:?--env-file requires a value}"
      env_file_from_default="false"
      shift 2
      ;;
    --no-build)
      build_image="false"
      shift
      ;;
    -h | --help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

if ! docker info >/dev/null 2>&1; then
  echo "run-local-docker: docker daemon unreachable; start Docker Desktop or OrbStack and retry." >&2
  exit 1
fi

if [[ "$build_image" == "true" ]]; then
  echo "run-local-docker: building ${image_tag} from ${repo_root}"
  build_sha="$(git -C "$repo_root" rev-parse --short HEAD 2>/dev/null || echo unknown)"
  build_time="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  build_args=(
    --build-arg "ROME_BUILD_SHA=$build_sha"
    --build-arg "ROME_BUILD_TIME=$build_time"
  )
  # Opt-in mirrors for flaky/proxied networks (e.g. apt 502s). Bare host for
  # ROME_APT_MIRROR (mirrors.tuna.tsinghua.edu.cn), full URL for ROME_NPM_REGISTRY.
  if [[ -n "${ROME_APT_MIRROR:-}" ]]; then
    build_args+=(--build-arg "APT_MIRROR=$ROME_APT_MIRROR")
  fi
  if [[ -n "${ROME_NPM_REGISTRY:-}" ]]; then
    build_args+=(--build-arg "NPM_REGISTRY=$ROME_NPM_REGISTRY")
  fi
  if [[ -n "${ROME_FORCE_CHROMIUM:-}" ]]; then
    build_args+=(--build-arg "ROME_FORCE_CHROMIUM=$ROME_FORCE_CHROMIUM")
  fi
  # Docker Desktop auto-funnels build traffic through the host system proxy, so
  # even in-China mirrors get tunneled (slow/unstable). NO_PROXY is a predefined
  # BuildKit proxy arg injected into every RUN; listing the mirror hosts makes
  # them connect directly, bypassing the proxy. Only inject it when a mirror is
  # actually in use, so default builds keep the stock proxy behavior untouched.
  # Override the host list via ROME_BUILD_NO_PROXY.
  if [[ -n "${ROME_APT_MIRROR:-}" || -n "${ROME_NPM_REGISTRY:-}" || -n "${ROME_BUILD_NO_PROXY:-}" ]]; then
    no_proxy_default="mirrors.tuna.tsinghua.edu.cn,mirrors.aliyun.com,mirrors.ustc.edu.cn,mirrors.huaweicloud.com,mirrors.cloud.tencent.com,mirror.sjtu.edu.cn,registry.npmmirror.com"
    no_proxy_hosts="${ROME_BUILD_NO_PROXY:-$no_proxy_default}"
    build_args+=(
      --build-arg "NO_PROXY=$no_proxy_hosts"
      --build-arg "no_proxy=$no_proxy_hosts"
    )
  fi
  docker build "${build_args[@]}" -t "$image_tag" .
fi

echo "run-local-docker: replacing container ${container_name}"
docker rm -f "$container_name" >/dev/null 2>&1 || true

echo "run-local-docker: starting ${container_name} at http://localhost:${host_port}"
docker_run_args=(
  -d
  --name "$container_name"
  -e NODE_ENV=production
  -e WEB_HOST=0.0.0.0
  -e TS_HOSTNAME="$container_name"
  --cap-add SYS_ADMIN
  --device /dev/fuse:/dev/fuse
  --security-opt apparmor:unconfined
  --restart unless-stopped
  -p "${host_port}:${container_port}"
)
if [[ "$env_file_from_default" == "true" && ! -f "$env_file" && -f "packages/core/.env.example" ]]; then
  echo "run-local-docker: ${env_file} not found; seeding it from packages/core/.env.example"
  cp packages/core/.env.example "$env_file"
fi
if [[ -f "$env_file" ]]; then
  docker_run_args+=(--env-file "$env_file")
else
  echo "run-local-docker: env file ${env_file} not found; continuing without --env-file"
fi
docker_run_args+=("$image_tag")
docker run "${docker_run_args[@]}"

echo
echo "Container: ${container_name}"
echo "Image    : ${image_tag}"
echo "URL      : http://localhost:${host_port}"

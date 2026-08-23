#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage: scripts/dev/publish-docker-image.sh [options]

Build the current Rome checkout into a multi-arch Docker image and push it to
a registry. Mirrors the .github/workflows/docker-publish.yml flow so the same
local invocation can stand in for the workflow_dispatch run.

Defaults match the workflow: yunfanye/rome:latest, linux/amd64+linux/arm64,
ROME_DOCKER_APP_CODE_MODE=compiled, zstd-9 registry output, docker-container
buildx builder named "rome-publish" (auto-created on first run).

Options:
  --tag TAG[,TAG...]   Image tag(s). Repeat or comma-separate.
                       Default: yunfanye/rome:latest
  --platforms LIST     Target platforms (default: linux/amd64,linux/arm64)
  --builder NAME       Buildx builder to use (default: rome-publish; created
                       with the docker-container driver if missing)
  --code-mode MODE     ROME_DOCKER_APP_CODE_MODE build-arg: source | compiled
                       (default: compiled)
  --load               Build for the host platform and load into the local
                       daemon instead of pushing. Forces a single-arch build.
  --no-prepare         Skip running scripts/docker/prepare-runtime-workspace.mjs
  -h, --help           Show this help

Environment overrides:
  ROME_PUBLISH_TAGS         Comma-separated default tags
  ROME_PUBLISH_PLATFORMS    Default platform list
  ROME_PUBLISH_BUILDER      Default builder name
  ROME_PUBLISH_CODE_MODE    Default code mode
EOF
}

repo_root="$(git rev-parse --show-toplevel)"
cd "$repo_root"

IFS=',' read -r -a tags <<<"${ROME_PUBLISH_TAGS:-yunfanye/rome:latest}"
platforms="${ROME_PUBLISH_PLATFORMS:-linux/amd64,linux/arm64}"
builder="${ROME_PUBLISH_BUILDER:-rome-publish}"
code_mode="${ROME_PUBLISH_CODE_MODE:-compiled}"
prepare_workspace="true"
load_only="false"
explicit_tags="false"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --tag)
      if [[ "$explicit_tags" == "false" ]]; then
        tags=()
        explicit_tags="true"
      fi
      IFS=',' read -r -a extra <<<"${2:?--tag requires a value}"
      tags+=("${extra[@]}")
      shift 2
      ;;
    --platforms)
      platforms="${2:?--platforms requires a value}"
      shift 2
      ;;
    --builder)
      builder="${2:?--builder requires a value}"
      shift 2
      ;;
    --code-mode)
      code_mode="${2:?--code-mode requires a value}"
      shift 2
      ;;
    --load)
      load_only="true"
      shift
      ;;
    --no-prepare)
      prepare_workspace="false"
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
  echo "publish-docker-image: docker daemon unreachable; start Docker Desktop or OrbStack and retry." >&2
  exit 1
fi

if [[ "$prepare_workspace" == "true" ]]; then
  echo "publish-docker-image: staging .docker/rome-runtime-workspace"
  node scripts/docker/prepare-runtime-workspace.mjs
fi

# `docker` driver (the Desktop default) can't drive multi-platform registry
# pushes, so we use a docker-container builder. Create it lazily; this is a
# no-op once it exists, mirroring docker/setup-buildx-action in CI.
if ! docker buildx inspect "$builder" >/dev/null 2>&1; then
  echo "publish-docker-image: creating buildx builder ${builder} (docker-container)"
  docker buildx create --name "$builder" --driver docker-container >/dev/null
fi
docker buildx inspect --bootstrap "$builder" >/dev/null

tag_args=()
for tag in "${tags[@]}"; do
  [[ -z "$tag" ]] && continue
  tag_args+=(--tag "$tag")
done
if [[ ${#tag_args[@]} -eq 0 ]]; then
  echo "publish-docker-image: at least one --tag is required" >&2
  exit 1
fi

if [[ "$load_only" == "true" ]]; then
  output_arg=(--load)
  # buildx --load only handles a single platform; let the host arch win.
  platforms="$(docker version --format '{{.Server.Os}}/{{.Server.Arch}}')"
  echo "publish-docker-image: --load set; building for host platform ${platforms} only"
else
  output_arg=(--output 'type=registry,compression=zstd,compression-level=9,force-compression=true,oci-mediatypes=true')
fi

action="pushing"
[[ "$load_only" == "true" ]] && action="loading"
echo "publish-docker-image: ${action} ${tags[*]} (${platforms}) via builder ${builder}"

docker buildx build \
  --builder "$builder" \
  --platform "$platforms" \
  --file .docker/rome-runtime-workspace/Dockerfile \
  --build-arg "ROME_DOCKER_APP_CODE_MODE=${code_mode}" \
  "${tag_args[@]}" \
  "${output_arg[@]}" \
  --progress=plain \
  .docker/rome-runtime-workspace

#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage: scripts/dev/create-patch-release-tag.sh [options]

Create the next patch release tag and push it to the release remote.

Defaults:
  remote: origin
  branch: main
  tag prefix: v

The script fetches remote tags, finds the highest stable vMAJOR.MINOR.PATCH tag,
bumps PATCH by one, creates an annotated tag on origin/main, and pushes the tag.

Options:
  --remote NAME       Git remote to fetch/push (default: origin)
  --branch NAME       Remote branch to tag (default: main)
  --prefix PREFIX     Tag prefix (default: v)
  --dry-run           Print the tag action without creating or pushing a tag
  -h, --help          Show this help

Environment overrides:
  ROME_RELEASE_REMOTE
  ROME_RELEASE_BRANCH
  ROME_RELEASE_TAG_PREFIX
EOF
}

remote="${ROME_RELEASE_REMOTE:-origin}"
branch="${ROME_RELEASE_BRANCH:-main}"
prefix="${ROME_RELEASE_TAG_PREFIX:-v}"
dry_run="false"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --remote)
      remote="${2:?--remote requires a value}"
      shift 2
      ;;
    --branch)
      branch="${2:?--branch requires a value}"
      shift 2
      ;;
    --prefix)
      prefix="${2:?--prefix requires a value}"
      shift 2
      ;;
    --dry-run)
      dry_run="true"
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

repo_root="$(git rev-parse --show-toplevel)"
cd "$repo_root"

if ! git remote get-url "$remote" >/dev/null 2>&1; then
  echo "create-patch-release-tag: remote '${remote}' does not exist" >&2
  exit 1
fi

echo "create-patch-release-tag: fetching ${remote} refs and tags"
git fetch "$remote" --tags

target_ref="${remote}/${branch}"
target_sha="$(git rev-parse --verify "${target_ref}^{commit}")"

semver_tag_regex="refs/tags/${prefix}[0-9]+\\.[0-9]+\\.[0-9]+$"
latest_tag="$(
  git ls-remote --tags --refs "$remote" |
    awk '{print $2}' |
    grep -E "$semver_tag_regex" |
    sed 's#^refs/tags/##' |
    sort -V |
    tail -1 || true
)"

if [[ -z "$latest_tag" ]]; then
  echo "create-patch-release-tag: no stable ${prefix}MAJOR.MINOR.PATCH tags found" >&2
  exit 1
fi

version="${latest_tag#"$prefix"}"
IFS='.' read -r major minor patch <<<"$version"
next_tag="${prefix}${major}.${minor}.$((patch + 1))"

if git rev-parse --verify --quiet "refs/tags/${next_tag}" >/dev/null; then
  echo "create-patch-release-tag: tag ${next_tag} already exists locally" >&2
  exit 1
fi

if git ls-remote --exit-code --tags "$remote" "refs/tags/${next_tag}" >/dev/null 2>&1; then
  echo "create-patch-release-tag: tag ${next_tag} already exists on ${remote}" >&2
  exit 1
fi

echo "create-patch-release-tag: latest stable tag is ${latest_tag}"
echo "create-patch-release-tag: next patch tag is ${next_tag}"
echo "create-patch-release-tag: target is ${target_ref} (${target_sha})"

if [[ "$dry_run" == "true" ]]; then
  echo "create-patch-release-tag: dry run; not creating or pushing ${next_tag}"
  exit 0
fi

git tag -a "$next_tag" "$target_sha" -m "Release ${next_tag}"
git push "$remote" "refs/tags/${next_tag}"

echo "create-patch-release-tag: pushed ${next_tag} to ${remote}"

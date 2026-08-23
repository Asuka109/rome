#!/usr/bin/env bash
# Verify that a pull request title is a valid Conventional Commit subject.
#
# Squash-and-merge writes the PR title as the merge commit subject on main, and
# release-please reads those subjects to decide the next version + CHANGELOG for
# every package listed in release-please-config.json. A non-conventional title
# is therefore silently invisible to the release flow — this check makes it a
# loud failure at PR time instead.
#
# Usage:
#   scripts/check-pr-title.sh "feat(app-runtime): add IpcRpcTimeoutError"
#   PR_TITLE="fix: ..." scripts/check-pr-title.sh
#
# CI passes the title through the PR_TITLE environment variable rather than as
# an inline workflow expression, so an attacker-authored title can never be
# interpolated into a shell command.
set -euo pipefail

title="${1-${PR_TITLE-}}"
# Trim surrounding whitespace so an invisible trailing space can't be the sole
# reason a title fails: `feat:` and `feat: ` are the same title to a reader.
#
# [:blank:], not [:space:]: the latter includes CR/LF, so trimming with it would
# strip a leading or trailing line break and hand the single-line check below a
# title that looks clean. Line breaks must survive the trim to be rejected.
title="${title#"${title%%[![:blank:]]*}"}"
title="${title%"${title##*[![:blank:]]}"}"

# Types accepted by the Conventional Commits spec's recommended set. The subset
# that actually moves a version is documented in docs/releases.md; the rest are
# valid titles that release-please ignores.
TYPES="build|chore|ci|docs|feat|fix|perf|refactor|revert|style|test"

# <type>[(<scope>)][!]: <subject>
#   - type is lower-case and drawn from TYPES
#   - scope, when present, is a non-empty lower-case identifier
#   - `!` marks a breaking change
#   - subject, when present, is separated from the colon by exactly one space
#
# The subject is optional on a non-breaking title: a bare `feat:` still parses
# into a type, which is all release-please needs to attribute the commit and pick
# a bump. Whether the subject reads well is a review judgement, not this gate's.
#
# It is NOT optional on a breaking title. release-please's parser
# (@conventional-commits/parser, bundled by the pinned action) silently reports
# `breaking: false` for `feat!:` while reporting `breaking: true` for
# `feat!: subject` — so a subject-less breaking title downgrades what should be a
# minor bump to a patch, with nothing anywhere saying so. Rejecting it here is
# the validator refusing input its consumer cannot faithfully handle.
SCOPE="\([a-z0-9][a-z0-9._/-]*\)"
# The subject's first character must be non-blank, so a second space after the
# colon is a rejection rather than leading padding baked into the commit subject.
SUBJECT_REQUIRED=": [^[:space:]].*"
SUBJECT_OPTIONAL=":( [^[:space:]].*)?"
PATTERN="^(${TYPES})(${SCOPE})?(!${SUBJECT_REQUIRED}|${SUBJECT_OPTIONAL})$"

fail() {
  echo "check-pr-title: $1" >&2
  cat >&2 <<EOF

  PR title: ${title:-<empty>}

  Titles must follow Conventional Commits (https://www.conventionalcommits.org/en/v1.0.0/):

    <type>[(<scope>)][!]: <subject>

  Allowed types: ${TYPES//|/, }
  The subject is optional, but when present it follows exactly one space.
  A breaking change (\`!\`) always needs one.

  Examples:
    feat(app-runtime): add IpcRpcTimeoutError
    fix(web): keep the connections list mounted while refetching
    feat!: drop the legacy action envelope
    chore: bump biome to 2.3.1

  Which type to pick when the change touches a released package, and how each
  type maps to a version bump, is in docs/releases.md.
EOF
  exit 1
}

if [ -z "$title" ]; then
  fail "no PR title provided (pass it as \$1 or set PR_TITLE)"
fi

if [[ $title == *$'\n'* || $title == *$'\r'* ]]; then
  fail "title must be a single line — it becomes the commit subject"
fi

if [[ ! $title =~ $PATTERN ]]; then
  # Name the specific mistake rather than restating the rule. Every branch below
  # exits, so `nocasematch` never leaks past this block.
  shopt -s nocasematch
  # Checked before casing: a bare `!` is the consequential error of the two, and
  # a mis-cased title that is also missing its subject should say so first.
  if [[ $title =~ ^(${TYPES})(${SCOPE})?!:[[:space:]]*$ ]]; then
    fail "a breaking change needs a subject — release-please reads a bare '!' as non-breaking, downgrading the minor bump to a patch"
  fi
  # The full grammar, case-insensitively: casing is the only thing wrong.
  if [[ $title =~ ^(${TYPES})(${SCOPE})?(!${SUBJECT_REQUIRED}|${SUBJECT_OPTIONAL})$ ]]; then
    fail "type and scope must be lower-case"
  fi
  # A known type carrying a scope that isn't a bare identifier. Matched with a
  # permissive `\(.*\)` precisely because the strict SCOPE grammar just failed.
  if [[ $title =~ ^(${TYPES})\(.*\)!?: ]]; then
    fail "scope must be a lower-case identifier — letters, digits, and . _ / -"
  fi
  if [[ $title =~ ^(${TYPES})(${SCOPE})?!?:[[:space:]] ]]; then
    fail "the subject must follow the colon after exactly one space"
  fi
  fail "title is not a Conventional Commit"
fi

echo "check-pr-title: OK — $title"

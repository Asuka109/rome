export type BuildInfo = {
  /** Release semver of the running image (no v prefix), or null on non-release builds. */
  version: string | null;
  /** Short git SHA of the running build, or null when it can't be determined. */
  sha: string | null;
  /** ISO-8601 timestamp of when the build was produced, or null when unknown. */
  builtAt: string | null;
};

let cached: BuildInfo | null = null;

/**
 * Resolves the running build's identity once and caches it for the process
 * lifetime — the answer can't change while the process runs.
 *
 * The values are frozen into `ROME_VERSION` / `ROME_BUILD_SHA` / `ROME_BUILD_TIME`
 * at image-build time (see the Dockerfile and the local-image build scripts).
 * When the env is absent — a source run that wasn't built through that path —
 * we degrade to nulls and the UI hides the footer rather than guessing at a
 * different value than production would report.
 */
export function getBuildInfo(): BuildInfo {
  if (!cached) {
    cached = {
      version: process.env.ROME_VERSION?.trim() || null,
      sha: process.env.ROME_BUILD_SHA?.trim() || null,
      builtAt: process.env.ROME_BUILD_TIME?.trim() || null,
    };
  }
  return cached;
}

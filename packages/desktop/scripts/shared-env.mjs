import { existsSync, readFileSync } from "fs";
import { resolve } from "path";

const STATSIG_CLIENT_KEY_ENV_KEY = "STATSIG_CLIENT_KEY";
const RUNTIME_IMAGE_ENV_KEY = "ROME_RUNTIME_IMAGE";

export function loadWorkspaceEnv(rootDir) {
  const envPath = resolve(rootDir, "..", "..", ".env");
  if (!existsSync(envPath)) {
    return;
  }

  const contents = readFileSync(envPath, "utf8");
  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    if (!key || process.env[key]) {
      continue;
    }

    const value = line.slice(separatorIndex + 1).trim();
    process.env[key] = stripWrappingQuotes(value);
  }
}

export function getDesktopBuildDefine() {
  return {
    __STATSIG_CLIENT_KEY__: JSON.stringify(resolveStatsigClientKey()),
    __ROME_RUNTIME_IMAGE__: JSON.stringify(resolveBakedRuntimeImage()),
  };
}

/**
 * The image this build is pinned to, or null when it is not a release.
 *
 * A tagged build sets ROME_RUNTIME_IMAGE so the app and the backend it boots
 * ship as one unit: the reference is frozen here rather than resolved at run
 * time, so two installs of the same app version cannot end up on different
 * backends. Local and manually dispatched builds leave it unset and keep the
 * moving tag, which is what makes a dev build follow whatever was published
 * last.
 */
function resolveBakedRuntimeImage() {
  const configured = process.env[RUNTIME_IMAGE_ENV_KEY]?.trim();
  return configured || null;
}

function resolveStatsigClientKey() {
  const configured = process.env[STATSIG_CLIENT_KEY_ENV_KEY]?.trim();
  return configured || null;
}

function stripWrappingQuotes(value) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}

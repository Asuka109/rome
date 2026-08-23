import { randomBytes } from "crypto";
import { chmodSync, writeFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import { ROME_CLOUD_ORIGIN } from "../rome-cloud";

/** Frozen at build time by `getDesktopBuildDefine`; null outside a release. */
declare const __ROME_RUNTIME_IMAGE__: string | null;

/**
 * A release build boots the backend it was cut with, so the two move together.
 * Anything else keeps the moving tag, and the env override wins over both — it
 * exists for pointing a dev build at a locally built image.
 */
export function resolveRuntimeImage(override: string | undefined, baked: string | null): string {
  return override?.trim() || baked || "yunfanye/rome:latest";
}

export const DEFAULT_RUNTIME_IMAGE = resolveRuntimeImage(
  process.env.ROME_DESKTOP_IMAGE,
  // Only esbuild defines the identifier; a loader without it would throw.
  typeof __ROME_RUNTIME_IMAGE__ === "string" ? __ROME_RUNTIME_IMAGE__ : null,
);

/**
 * Whether this build boots a version it was cut with, rather than whatever a
 * moving tag points at. Only then is the previous image safe to reclaim: a dev
 * build follows `:latest`, and an override often names a locally built image
 * with no registry copy to pull back.
 */
export function isPinnedRelease(override: string | undefined, baked: string | null): boolean {
  return !override?.trim() && baked !== null;
}

export const RUNTIME_IMAGE_IS_PINNED = isPinnedRelease(
  process.env.ROME_DESKTOP_IMAGE,
  typeof __ROME_RUNTIME_IMAGE__ === "string" ? __ROME_RUNTIME_IMAGE__ : null,
);

const DEFAULT_PROXY_PORT = 47823;

/**
 * Fixed loopback port for the host-side proxy. Two things need it stable across
 * launches: core writes it into every loopback OAuth redirect_uri (Rome Cloud
 * sends the browser back here), and Chromium keys the dashboard's localStorage
 * on the origin, port included. The default sits below the ephemeral range
 * (49152+) so macOS never assigns it to another process on its own.
 *
 * Overridable because the port binds with no fallback — if something the user
 * cannot quit already holds it, this is the lever support can pull. A `.app`
 * launched from Finder inherits no shell environment, so the GUI path is
 * `launchctl setenv ROME_DESKTOP_PROXY_PORT <port>` plus a relaunch.
 *
 * Resolved on call, never at module load: index.ts constructs the RuntimeManager
 * at module scope, so a throw here would kill the process before `app.ready`
 * with no window and no dialog. Called from ensureLocalProxy and ensureRuntimeFiles, a bad value
 * surfaces as a "failed" runtime phase the user can read.
 */
export function resolveProxyPort(): number {
  const raw = process.env.ROME_DESKTOP_PROXY_PORT?.trim();
  if (!raw) return DEFAULT_PROXY_PORT;
  const parsed = Number(raw);
  // Reject rather than silently falling back: a typo would otherwise reproduce
  // the exact "port in use" error the override was set to escape, with no hint
  // that it was ignored. A fractional value would reach server.listen() and
  // throw ERR_SOCKET_BAD_PORT as a raw Node string.
  if (!Number.isInteger(parsed) || parsed < 1024 || parsed > 65535) {
    throw new Error(
      `ROME_DESKTOP_PROXY_PORT must be a whole number between 1024 and 65535; got "${raw}".`,
    );
  }
  return parsed;
}

export interface RuntimePaths {
  rootDir: string;
  envFile: string;
  /** Host filesystem path where the runtime provider publishes the Rome HTTP server as a unix socket. */
  socketPath: string;
  /**
   * Host filesystem path mounted into the container as /home/rome so the
   * Rome user's entire home directory — Rome's own state under .rome/ plus
   * any CLI tool login state (claude-code, codex, gh, git config, …) —
   * survives container rm / image upgrade. Mirrors the docker-compose
   * `rome-home:/home/rome` named volume.
   */
  homeDir: string;
  debugLogFile: string;
}

export interface RuntimeEnvConfig {
  jwtSecret?: string;
  anthropicApiKey?: string | null;
  publicOrigin: string;
  /** Host-reachable origin of the loopback proxy — the address the browser uses. */
  instanceOrigin: string;
}

export function resolveRuntimePaths(home = homedir()): RuntimePaths {
  const rootDir = join(home, ".rome-desktop", "runtime");
  return {
    rootDir,
    envFile: join(rootDir, ".env"),
    socketPath: join(rootDir, "rome.sock"),
    homeDir: join(rootDir, "rome-home"),
    debugLogFile: join(home, ".rome-desktop", "debug.log"),
  };
}

export function generateRuntimeEnv(config: RuntimeEnvConfig): string {
  const values = new Map<string, string>();
  values.set("ROME_JWT_SECRET", config.jwtSecret?.trim() || generateSecret());
  values.set("ROME_COOKIE_SECURE", "false");
  // ~1 year. The desktop app runs locally and authenticates once at enrollment;
  // a long-lived guardian session keeps the user from re-authenticating on every
  // launch. Cloud instances leave this unset and keep the 30-day default.
  values.set("ROME_SESSION_MAX_AGE_SECONDS", String(60 * 60 * 24 * 365));
  values.set("ROME_PUBLIC_ORIGIN", config.publicOrigin);
  // Write the single Rome Cloud origin. It must be reachable from inside the VM,
  // so a local dev Rome Cloud needs a host-reachable origin — e.g.
  // `ROME_DESKTOP_PANTHEON_ORIGIN=http://host.docker.internal:3100`, not a bare
  // loopback (which the guest resolves to itself).
  values.set("PANTHEON_BASE_ORIGIN", ROME_CLOUD_ORIGIN);
  // Core builds every loopback OAuth redirect_uri from this. It must be the
  // address the BROWSER can reach — the host loopback proxy — not the port
  // Rome's own HTTP server binds inside the VM. Deliberately NOT
  // PANTHEON_INSTANCE_ORIGIN: that also feeds the agent prompt and the Favors
  // return_to, and Rome Cloud drops any return_to host outside PANTHEON_DOMAIN.
  values.set("ROME_LOOPBACK_CALLBACK_ORIGIN", config.instanceOrigin);

  if (config.anthropicApiKey?.trim()) {
    values.set("ANTHROPIC_API_KEY", config.anthropicApiKey.trim());
  }

  const lines = [
    `# Rome managed runtime`,
    `# Generated automatically; advanced users may edit carefully.`,
    "",
  ];

  for (const [key, value] of values.entries()) {
    lines.push(`${key}=${value}`);
  }

  lines.push("");
  return lines.join("\n");
}

export function parseSimpleEnvFile(contents: string): Map<string, string> {
  const values = new Map<string, string>();

  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const separator = line.indexOf("=");
    if (separator === -1) continue;

    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim();
    if (key) values.set(key, value);
  }

  return values;
}

export function writeManagedRuntimeEnv(envFile: string, contents: string): void {
  writeFileSync(envFile, contents, { encoding: "utf8", mode: 0o600 });
  chmodSync(envFile, 0o600);
}

function generateSecret(): string {
  return randomBytes(32).toString("base64");
}

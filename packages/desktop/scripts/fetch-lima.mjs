/**
 * Lima version-bump tool. NOT part of the build.
 *
 * The bundled Lima binary + guest agent + Rome template live committed at
 *   packages/desktop/lima/bin/limactl
 *   packages/desktop/lima/share/lima/lima-guestagent.Linux-aarch64.gz
 *   packages/desktop/lima/templates/rome.yaml
 * and are shipped into Rome.app/Contents/Resources/lima/ via the
 * `extraResources` glob in electron-builder.yml. Day-to-day `pnpm build`
 * does not touch this script.
 *
 * Use this script only when bumping Lima:
 *   1. Edit LIMA_VERSION below (and PINNED_SHA256 to "" so the new hash
 *      gets logged).
 *   2. Run `node scripts/fetch-lima.mjs --force` from packages/desktop/.
 *   3. Copy the logged SHA-256 into PINNED_SHA256, re-run to verify, and
 *      commit the updated lima/ tree alongside the script change.
 *
 * Security model:
 *   - SHA-256 of the downloaded tarball is verified against LIMA_SHA256 (or
 *     the env override). The pin is the trust anchor.
 *   - Bundled limactl is signed (Developer ID + entitlements) by the
 *     electron-builder afterPack hook before electron-builder's own signing
 *     pass, so the outer bundle seal and the notarization ticket cover the
 *     final limactl CDHash.
 */
import { createHash } from "crypto";
import { execFileSync } from "child_process";
import {
  createWriteStream,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
  cpSync,
} from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

/**
 * Pin a specific Lima release. Bump on a desktop release boundary, never
 * silently — the README under packages/desktop/ should be kept in sync.
 */
export const LIMA_VERSION = process.env.LIMA_VERSION?.trim() || "2.1.1";

/**
 * SHA-256 of the upstream tarball. Override at build time via env var until
 * a pin is committed. When LIMA_SHA256 is empty *and* no env override is
 * provided, the script logs the observed hash but does not fail — handy
 * during local development; CI must always set it.
 */
const PINNED_SHA256 = "b6b0e6701189cd8c4e549cc39e6d054dc681487798b9b774ad2cbd30c08b2bd8"; // bump alongside LIMA_VERSION
const EXPECTED_SHA256 = process.env.LIMA_SHA256?.trim() || PINNED_SHA256 || null;

const TARBALL_NAME = `lima-${LIMA_VERSION}-Darwin-arm64.tar.gz`;
const TARBALL_URL = `https://github.com/lima-vm/lima/releases/download/v${LIMA_VERSION}/${TARBALL_NAME}`;

const OUT_DIR = resolve(root, "lima");
const BIN_DIR = resolve(OUT_DIR, "bin");
const SHARE_DIR = resolve(OUT_DIR, "share");
const TEMPLATES_DIR = resolve(OUT_DIR, "templates");
const STAMP_FILE = resolve(OUT_DIR, ".version");
const TMP_DIR = resolve(root, ".tmp");
const TARBALL_PATH = resolve(TMP_DIR, TARBALL_NAME);
const EXTRACT_DIR = resolve(TMP_DIR, `lima-${LIMA_VERSION}-extracted`);

function log(message) {
  console.log(`[lima] ${message}`);
}

function isAlreadyFetched() {
  if (!existsSync(STAMP_FILE) || !existsSync(resolve(BIN_DIR, "limactl"))) {
    return false;
  }
  try {
    return readFileSync(STAMP_FILE, "utf8").trim() === LIMA_VERSION;
  } catch {
    return false;
  }
}

async function downloadTarball() {
  mkdirSync(TMP_DIR, { recursive: true });
  if (existsSync(TARBALL_PATH)) {
    log(`Reusing cached tarball at ${TARBALL_PATH}`);
    return;
  }
  log(`Downloading ${TARBALL_URL}`);
  await downloadWithRedirects(TARBALL_URL, TARBALL_PATH);
}

async function downloadWithRedirects(url, destination, hops = 0) {
  if (hops > 5) throw new Error(`Too many redirects fetching ${url}`);

  await new Promise((resolvePromise, rejectPromise) => {
    import("https")
      .then(({ get }) => {
        const request = get(url, (response) => {
          const status = response.statusCode ?? 0;
          const location = response.headers.location;

          if (status >= 300 && status < 400 && location) {
            response.resume();
            downloadWithRedirects(location, destination, hops + 1)
              .then(resolvePromise)
              .catch(rejectPromise);
            return;
          }

          if (status !== 200) {
            response.resume();
            rejectPromise(new Error(`Unexpected status ${status} fetching ${url}`));
            return;
          }

          const file = createWriteStream(destination);
          response.pipe(file);
          file.on("finish", () => file.close(() => resolvePromise()));
          file.on("error", (error) => {
            rmSync(destination, { force: true });
            rejectPromise(error);
          });
        });

        request.on("error", rejectPromise);
      })
      .catch(rejectPromise);
  });
}

function verifyChecksum() {
  const hash = createHash("sha256").update(readFileSync(TARBALL_PATH)).digest("hex");
  if (EXPECTED_SHA256) {
    if (hash.toLowerCase() !== EXPECTED_SHA256.toLowerCase()) {
      throw new Error(
        `SHA-256 mismatch for ${TARBALL_PATH}: expected ${EXPECTED_SHA256}, got ${hash}`,
      );
    }
    log(`SHA-256 OK (${hash})`);
  } else {
    log(`SHA-256 ${hash} (no LIMA_SHA256 set — skipping verification)`);
  }
}

function extractTarball() {
  rmSync(EXTRACT_DIR, { recursive: true, force: true });
  mkdirSync(EXTRACT_DIR, { recursive: true });
  log(`Extracting tarball into ${EXTRACT_DIR}`);
  execFileSync("tar", ["-xzf", TARBALL_PATH, "-C", EXTRACT_DIR], { stdio: "inherit" });
}

function publishLayout() {
  // The Rome-specific template under lima/templates/rome.yaml is hand-
  // authored and committed; never wipe it. We only replace bin/ and
  // share/, which come from the upstream tarball.
  rmSync(BIN_DIR, { recursive: true, force: true });
  rmSync(SHARE_DIR, { recursive: true, force: true });
  mkdirSync(BIN_DIR, { recursive: true });
  mkdirSync(SHARE_DIR, { recursive: true });
  mkdirSync(TEMPLATES_DIR, { recursive: true });

  const srcBin = resolve(EXTRACT_DIR, "bin", "limactl");
  if (!existsSync(srcBin)) {
    throw new Error(`Expected limactl at ${srcBin} after extracting tarball.`);
  }
  cpSync(srcBin, resolve(BIN_DIR, "limactl"));

  // Lima discovers the guest agent relative to the limactl binary path
  // (<dir of limactl>/../share/lima/lima-guestagent.Linux-<arch>.gz).
  const guestAgent = resolve(EXTRACT_DIR, "share", "lima", "lima-guestagent.Linux-aarch64.gz");
  if (!existsSync(guestAgent)) {
    throw new Error(`Expected guest agent at ${guestAgent} after extracting tarball.`);
  }
  const guestAgentOut = resolve(SHARE_DIR, "lima", "lima-guestagent.Linux-aarch64.gz");
  mkdirSync(dirname(guestAgentOut), { recursive: true });
  cpSync(guestAgent, guestAgentOut);

  // Lima resolves `base: [template:_images/..., template:_default/...]`
  // against <limactl-dir>/../share/lima/templates/. Upstream ships ~30
  // distro image manifests under _images/ that Rome will never use; copy
  // only the ones rome.yaml actually references plus the _default/ files
  // it depends on. When rome.yaml's base: list changes, update the
  // allowlists below.
  //
  // Rome's rome.yaml uses `images: [{ location: <bundled.qcow2> }]` and no
  // longer references an upstream `base:` template. Keep ubuntu-25.10.yaml as
  // a rollback escape hatch so restoring that base does not also require a CI
  // change.
  const TEMPLATE_ALLOWLIST = {
    _images: ["ubuntu-25.10.yaml"],
  };
  for (const [sub, files] of Object.entries(TEMPLATE_ALLOWLIST)) {
    const upstreamSub = resolve(EXTRACT_DIR, "share", "lima", "templates", sub);
    if (!existsSync(upstreamSub)) {
      throw new Error(`Missing upstream Lima template subdir ${sub} at ${upstreamSub}.`);
    }
    const outSub = resolve(SHARE_DIR, "lima", "templates", sub);
    mkdirSync(outSub, { recursive: true });
    for (const name of files) {
      const src = resolve(upstreamSub, name);
      if (!existsSync(src)) {
        throw new Error(`Missing required Lima template ${sub}/${name} at ${src}.`);
      }
      cpSync(src, resolve(outSub, name));
    }
  }

  if (!existsSync(resolve(TEMPLATES_DIR, "rome.yaml"))) {
    throw new Error(
      `Missing hand-authored Lima template at ${resolve(TEMPLATES_DIR, "rome.yaml")}.`,
    );
  }

  writeFileSync(STAMP_FILE, `${LIMA_VERSION}\n`, "utf8");
}

export async function fetchLima({ force = false } = {}) {
  if (process.platform !== "darwin") {
    log(`Skipping (host platform is ${process.platform}, expected darwin).`);
    return;
  }
  if (!force && isAlreadyFetched()) {
    log(`Already fetched version ${LIMA_VERSION} — skipping.`);
    return;
  }

  await downloadTarball();
  verifyChecksum();
  extractTarball();
  publishLayout();

  log(`Done. Bundle ready at ${OUT_DIR}`);
}

const invokedDirectly =
  import.meta.url === `file://${process.argv[1]}` ||
  import.meta.url === `file://${process.argv[1]}.mjs`;

if (invokedDirectly) {
  fetchLima({ force: process.argv.includes("--force") }).catch((error) => {
    console.error(`[lima] ${error.message}`);
    process.exit(1);
  });
}

/**
 * Rome desktop guest image — smoke test.
 *
 * Boots the bundled qcow2 with the pinned limactl in a throwaway LIMA_HOME,
 * then exercises the surface Rome actually uses at runtime:
 *
 *   1. `limactl start` reaches Running on the new image.
 *   2. The mounted ~/.rome-desktop subtree is writable from inside the VM.
 *   3. `nerdctl --namespace rome info` succeeds (containerd is alive, no
 *      nerdctl-full installer ran on first boot).
 *   4. A trivial OCI pull works through slirp.
 *
 * Cleans up the instance and the throwaway LIMA_HOME on exit. Intended for
 * macOS arm64 only — both the limactl binary and the qcow2 are aarch64.
 *
 * Usage:
 *   node packages/desktop/scripts/smoke-guest-image.mjs
 *   node packages/desktop/scripts/smoke-guest-image.mjs --keep   # don't tear down on failure
 */
import { execFile, spawn } from "child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "fs";
import { dirname, join, resolve } from "path";
import { fileURLToPath } from "url";
import { promisify } from "util";
import { parse as parseYaml } from "yaml";

const execFileAsync = promisify(execFile);
const __dirname = dirname(fileURLToPath(import.meta.url));
const DESKTOP_ROOT = resolve(__dirname, "..");
const LIMACTL = join(DESKTOP_ROOT, "lima", "bin", "limactl");
const TEMPLATE = join(DESKTOP_ROOT, "lima", "templates", "rome.yaml");

const INSTANCE = "rome-smoke";
const KEEP_ON_FAILURE = process.argv.includes("--keep");
// macOS's os.tmpdir() points at /var/folders/<hash>/T/... which is already
// ~56 characters before we add anything. Lima then nests
// `<LIMA_HOME>/<instance>/ssh.sock.<pid>` underneath; the resulting unix
// socket path blows past the 104-char UNIX_PATH_MAX and `limactl start`
// aborts. /tmp is short enough that the full sock path stays in budget.
const SHORT_TMP_ROOT = "/tmp";
// Image presence is necessary; the path inside the template is resolved
// from the template's own directory ({{.Dir}}/../images/...) so we just
// need to confirm the file is there.
const IMAGE_DIR = join(DESKTOP_ROOT, "lima", "images");

// Tiny multi-arch image (~12 KB) on Docker Hub. Used to confirm
// nerdctl pull works end-to-end through slirp; not exercised beyond
// the pull. Docker Hub is the most reliable public registry — ghcr.io
// has been observed dropping TLS handshakes through host TUN proxies.
const SMOKE_PULL_IMAGE = "docker.io/library/hello-world:latest";

function log(message) {
  console.log(`[smoke] ${message}`);
}

function preflight() {
  for (const path of [LIMACTL, TEMPLATE]) {
    if (!existsSync(path)) {
      throw new Error(`Required file missing: ${path}`);
    }
  }
  // Resolve images[0].location relative to the template's directory.
  const parsed = parseYaml(readFileSync(TEMPLATE, "utf8"));
  const location = parsed?.images?.[0]?.location;
  if (typeof location !== "string") {
    throw new Error(`rome.yaml has no images[0].location to smoke against.`);
  }
  const filename = location.split("/").pop();
  const imagePath = join(IMAGE_DIR, filename);
  if (!existsSync(imagePath)) {
    throw new Error(
      `Bundled guest image missing at ${imagePath}.\n` +
        `Run: node scripts/fetch-guest-image.mjs --force`,
    );
  }
  log(`limactl: ${LIMACTL}`);
  log(`template: ${TEMPLATE}`);
  log(`image: ${imagePath}`);
  return imagePath;
}

function makeLimaHome() {
  const home = mkdtempSync(join(SHORT_TMP_ROOT, "rome-smoke-lima-"));
  log(`LIMA_HOME=${home}`);
  return home;
}

function makeMountSource() {
  const dir = mkdtempSync(join(SHORT_TMP_ROOT, "rome-smoke-mount-"));
  // Mirror the production layout enough that the template's
  // mounts: [~/.rome-desktop] resolves to a writable target.
  const desktop = join(dir, ".rome-desktop");
  mkdirSync(desktop, { recursive: true });
  log(`mount source: ${desktop}`);
  return { dir, desktop };
}

function spawnStream(args, env, timeoutMs = 6 * 60_000) {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(LIMACTL, args, { env });
    const tag = `lima ${args[0] ?? ""}`.trim();
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => process.stdout.write(`[${tag}] ${chunk}`));
    child.stderr.on("data", (chunk) => process.stderr.write(`[${tag}] ${chunk}`));

    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      rejectPromise(new Error(`${tag} timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    child.on("exit", (code, signal) => {
      clearTimeout(timer);
      if (code === 0) resolvePromise();
      else rejectPromise(new Error(`${tag} exited code=${code} signal=${signal}`));
    });
  });
}

async function shell(env, command) {
  log(`shell> ${command}`);
  const { stdout, stderr } = await execFileAsync(
    LIMACTL,
    ["shell", "--workdir=/", INSTANCE, "sh", "-c", command],
    { env, timeout: 60_000 },
  );
  if (stdout.trim()) console.log(stdout.trim());
  if (stderr.trim()) console.error(stderr.trim());
  return stdout;
}

async function teardown(env, limaHome, mountRoot) {
  log("Tearing down");
  try {
    await execFileAsync(LIMACTL, ["stop", "--force", INSTANCE], { env, timeout: 60_000 });
  } catch {
    // Already stopped.
  }
  try {
    await execFileAsync(LIMACTL, ["delete", "--force", INSTANCE], { env, timeout: 60_000 });
  } catch {
    // Already gone.
  }
  rmSync(limaHome, { recursive: true, force: true });
  rmSync(mountRoot, { recursive: true, force: true });
}

async function main() {
  if (process.platform !== "darwin" || process.arch !== "arm64") {
    throw new Error(
      `Smoke harness only runs on macOS arm64; this host is ${process.platform}/${process.arch}.`,
    );
  }

  const imagePath = preflight();

  const limaHome = makeLimaHome();
  const { dir: mountRoot, desktop } = makeMountSource();
  const env = { ...process.env, LIMA_HOME: limaHome, HOME: mountRoot };

  try {
    log("Starting instance");
    // Lima does not expand template variables (e.g. `{{.Dir}}`) in
    // images[].location, so the rome.yaml value is a placeholder we
    // override at start time with the absolute path resolved from the
    // bundled image directory.
    const setImageLocation = `.images[0].location = ${JSON.stringify(imagePath)}`;
    // Lima resolves `~` against the system getpwuid home, not the
    // HOME env var we pass to spawn, so a default-config smoke would
    // mount the user's real ~/.rome-desktop (containing production
    // state) into the throwaway VM. Override the mount source to the
    // tmp dir we just minted so the smoke is fully self-contained.
    const setMountLocation = `.mounts[0].location = ${JSON.stringify(desktop)}`;
    await spawnStream(
      [
        "start",
        "--tty=false",
        "--name",
        INSTANCE,
        "--set",
        setImageLocation,
        "--set",
        setMountLocation,
        TEMPLATE,
      ],
      env,
      8 * 60_000,
    );

    log("Verifying writable mount");
    const stamp = `rome-smoke-${Date.now()}`;
    // Lima's virtiofs maps host paths verbatim into the guest. The
    // template's `mounts: [~/.rome-desktop]` resolves against the HOME we
    // injected above, so the guest sees the same absolute path.
    await shell(env, `printf '${stamp}' > ${desktop}/smoke-stamp`);
    const written = readFileSync(join(desktop, "smoke-stamp"), "utf8");
    if (written !== stamp) {
      throw new Error(`Mount round-trip failed: wrote ${stamp}, read back ${written}`);
    }
    log(`Mount round-trip OK (${written})`);

    log("Probing containerd via nerdctl");
    await shell(env, "sudo nerdctl --namespace rome info >/dev/null");

    log(`Pulling ${SMOKE_PULL_IMAGE}`);
    await shell(env, `sudo nerdctl --namespace rome pull ${SMOKE_PULL_IMAGE}`);

    log("PASS");
  } catch (error) {
    log(`FAIL: ${error.message}`);
    if (KEEP_ON_FAILURE) {
      log(`--keep set; leaving instance for inspection: LIMA_HOME=${limaHome}`);
      process.exitCode = 1;
      return;
    }
    await teardown(env, limaHome, mountRoot);
    process.exitCode = 1;
    return;
  }

  await teardown(env, limaHome, mountRoot);
}

main().catch((error) => {
  console.error(`[smoke] ${error.stack || error.message}`);
  process.exit(1);
});

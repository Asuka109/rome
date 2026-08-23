/**
 * electron-builder beforePack hook: refuse to package if any LFS-tracked
 * Lima asset is still a Git LFS pointer file instead of the real bytes.
 *
 * `lima/bin/limactl`, `lima/share/lima/lima-guestagent.Linux-aarch64.gz`,
 * and `lima/images/*.qcow2` are stored in Git LFS. On a clone where
 * `git-lfs` is not installed (or a CI checkout that did not opt into
 * LFS), Git silently leaves the working-copy entries as ~130-byte
 * pointer text files instead of the real binaries. electron-builder
 * would copy those pointers into the .app; signing and notarization
 * pass, and the failure only surfaces at runtime when limactl can't
 * execute or Lima can't load the qcow2. Catching it here turns a
 * confusing post-install crash into an actionable build error.
 */
import { readFileSync, readdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DESKTOP_ROOT = join(__dirname, "..");
const LFS_MARKER = "version https://git-lfs.github.com/spec/v1";

// Hardcoded entries rather than parsing .gitattributes: the LFS surface
// for this package is small and stable, and an explicit list makes the
// failure message point at the exact files the developer needs to fetch.
const LFS_TRACKED_FILES = ["lima/bin/limactl", "lima/share/lima/lima-guestagent.Linux-aarch64.gz"];

// Globs we expand at run time. Pattern lives in .gitattributes; matched
// against the committed contents of the directory.
const LFS_TRACKED_DIRS = [{ dir: "lima/images", suffix: ".qcow2" }];

export default async function beforePack() {
  const offenders = [];

  for (const rel of LFS_TRACKED_FILES) {
    if (isLfsPointer(join(DESKTOP_ROOT, rel))) offenders.push(rel);
  }

  for (const { dir, suffix } of LFS_TRACKED_DIRS) {
    const absDir = join(DESKTOP_ROOT, dir);
    for (const name of readdirSync(absDir)) {
      if (!name.endsWith(suffix)) continue;
      const rel = `${dir}/${name}`;
      if (isLfsPointer(join(DESKTOP_ROOT, rel))) offenders.push(rel);
    }
  }

  if (offenders.length === 0) return;

  const list = offenders.map((p) => `  - ${p}`).join("\n");
  throw new Error(
    `Refusing to pack: the following Lima assets are Git LFS pointers, ` +
      `not the actual files:\n${list}\n\n` +
      `Run:\n  git lfs install && git lfs pull\n` +
      `and re-run the build.`,
  );
}

function isLfsPointer(absPath) {
  const head = readFileSync(absPath, { encoding: "utf8" }).slice(0, 200);
  return head.startsWith(LFS_MARKER);
}

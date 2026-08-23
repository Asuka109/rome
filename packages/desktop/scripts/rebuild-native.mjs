/**
 * Rebuild better-sqlite3's native .node addon for Electron's ABI.
 *
 * In a pnpm workspace, better-sqlite3 is hoisted and compiled for system Node.js.
 * We compile a separate .node binary for Electron into native/better_sqlite3.node.
 * macOS release builds can request a universal binding with
 * ROME_DESKTOP_NATIVE_ARCH=universal.
 * At runtime, database.ts passes this path via the `nativeBinding` option.
 */
import { execSync } from "child_process";
import {
  cpSync,
  mkdirSync,
  existsSync,
  readFileSync,
  rmSync,
  realpathSync,
  writeFileSync,
} from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const nativeDir = resolve(root, "native");
const bindingPath = resolve(nativeDir, "better_sqlite3.node");
const metadataPath = resolve(nativeDir, "better_sqlite3.meta.json");
const require = createRequire(import.meta.url);

function getSqlitePackageDir() {
  try {
    const sqlitePkg = require.resolve("better-sqlite3/package.json");
    return dirname(realpathSync(sqlitePkg));
  } catch {
    console.error("Cannot find better-sqlite3. Run pnpm install first.");
    process.exit(1);
  }
}

function getElectronVersion() {
  return require("electron/package.json").version;
}

function getSqliteVersion() {
  return require("better-sqlite3/package.json").version;
}

function readBindingMetadata() {
  if (!existsSync(bindingPath) || !existsSync(metadataPath)) {
    return null;
  }

  try {
    return JSON.parse(readFileSync(metadataPath, "utf8"));
  } catch {
    return null;
  }
}

function requestedArch() {
  return process.env.ROME_DESKTOP_NATIVE_ARCH || process.arch;
}

function isBindingCurrent(electronVersion) {
  const metadata = readBindingMetadata();
  const sqliteVersion = getSqliteVersion();
  return Boolean(
    metadata &&
      metadata.electronVersion === electronVersion &&
      metadata.sqliteVersion === sqliteVersion &&
      metadata.arch === requestedArch() &&
      metadata.platform === process.platform,
  );
}

function buildBindingForArch(sqlitePkgDir, electronVersion, arch) {
  const buildDir = resolve(nativeDir, `_build_${arch}`);
  if (existsSync(buildDir)) rmSync(buildDir, { recursive: true });
  mkdirSync(buildDir, { recursive: true });
  cpSync(sqlitePkgDir, buildDir, { recursive: true, dereference: true });

  execSync(
    `npx --yes node-gyp rebuild --directory="${buildDir}" --target=${electronVersion} --arch=${arch} --dist-url=https://electronjs.org/headers --runtime=electron`,
    { stdio: "inherit", cwd: buildDir },
  );

  const builtNode = resolve(buildDir, "build", "Release", "better_sqlite3.node");
  if (!existsSync(builtNode)) {
    console.error(`Build succeeded but ${arch} .node file was not found!`);
    process.exit(1);
  }

  return { buildDir, builtNode };
}

export function ensureBetterSqlite3Binding() {
  const electronVersion = getElectronVersion();
  const sqliteVersion = getSqliteVersion();
  const arch = requestedArch();
  if (isBindingCurrent(electronVersion)) {
    console.log(
      `Native binding up to date: better_sqlite3.node (Electron ${electronVersion}, ${arch})`,
    );
    return false;
  }

  const sqlitePkgDir = getSqlitePackageDir();
  console.log(`Source: ${sqlitePkgDir}`);
  console.log(`Target: Electron ${electronVersion}`);

  const buildResults = [];
  if (arch === "universal") {
    if (process.platform !== "darwin") {
      console.error("Universal native binding builds are only supported on macOS.");
      process.exit(1);
    }

    buildResults.push(buildBindingForArch(sqlitePkgDir, electronVersion, "x64"));
    buildResults.push(buildBindingForArch(sqlitePkgDir, electronVersion, "arm64"));
    mkdirSync(nativeDir, { recursive: true });
    execSync(
      `lipo -create -output "${bindingPath}" "${buildResults[0].builtNode}" "${buildResults[1].builtNode}"`,
      { stdio: "inherit" },
    );
  } else {
    const result = buildBindingForArch(sqlitePkgDir, electronVersion, arch);
    buildResults.push(result);
    mkdirSync(nativeDir, { recursive: true });
    cpSync(result.builtNode, bindingPath);
  }

  writeFileSync(
    metadataPath,
    JSON.stringify(
      {
        electronVersion,
        sqliteVersion,
        arch,
        platform: process.platform,
      },
      null,
      2,
    ) + "\n",
  );

  for (const { buildDir } of buildResults) {
    rmSync(buildDir, { recursive: true });
  }

  console.log(`Done: native/better_sqlite3.node (Electron ${electronVersion}, ${arch})`);
  return true;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  ensureBetterSqlite3Binding();
}

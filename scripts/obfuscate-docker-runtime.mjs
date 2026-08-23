#!/usr/bin/env node
import { readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const projectRoot = fileURLToPath(new URL("..", import.meta.url));
const targets = [
  { root: join(projectRoot, "packages/core/dist"), format: "esm" },
  { root: join(projectRoot, "dist/scripts"), format: "cjs" },
];
const esbuildModuleCandidates = [
  join(projectRoot, "node_modules/esbuild/lib/main.js"),
  join(projectRoot, "packages/desktop/node_modules/esbuild/lib/main.js"),
];

export function shouldObfuscateDockerRuntime(env = process.env) {
  return env.ROME_DOCKER_APP_CODE_MODE === "compiled";
}

async function pathExists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

export async function collectJavaScriptFiles(root, format) {
  if (!(await pathExists(root))) {
    return [];
  }

  const entries = await readdir(root, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = join(root, entry.name);
      if (entry.isDirectory()) {
        return collectJavaScriptFiles(entryPath, format);
      }
      if (entry.isFile() && entry.name.endsWith(".js")) {
        return [{ path: entryPath, format }];
      }
      return [];
    }),
  );

  return files.flat().sort((a, b) => a.path.localeCompare(b.path));
}

async function collectSourceMapFiles(root) {
  if (!(await pathExists(root))) {
    return [];
  }

  const entries = await readdir(root, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = join(root, entry.name);
      if (entry.isDirectory()) {
        return collectSourceMapFiles(entryPath);
      }
      if (entry.isFile() && entry.name.endsWith(".js.map")) {
        return [entryPath];
      }
      return [];
    }),
  );

  return files.flat().sort();
}

async function loadEsbuild() {
  for (const candidate of await findEsbuildModuleCandidates()) {
    if (!(await pathExists(candidate))) {
      continue;
    }

    try {
      return await import(pathToFileURL(candidate).href);
    } catch {
      // Try the next candidate.
    }
  }

  throw new Error("Unable to load workspace esbuild dependency for Docker runtime obfuscation.");
}

async function findEsbuildModuleCandidates() {
  const pnpmDir = join(projectRoot, "node_modules/.pnpm");
  const pnpmCandidates = [];

  try {
    const entries = await readdir(pnpmDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory() && entry.name.startsWith("esbuild@")) {
        pnpmCandidates.push(join(pnpmDir, entry.name, "node_modules/esbuild/lib/main.js"));
      }
    }
  } catch {
    // Fall back to the normal workspace symlink candidates.
  }

  return [...esbuildModuleCandidates, ...pnpmCandidates.sort().reverse()];
}

export async function obfuscateJavaScriptFile(file, esbuild) {
  const source = await readFile(file.path, "utf8");
  const result = await esbuild.transform(source, {
    charset: "ascii",
    format: file.format,
    keepNames: true,
    legalComments: "none",
    loader: "js",
    minify: true,
    platform: "node",
    sourcemap: false,
    target: "node24",
  });

  await writeFile(file.path, `${result.code.trimEnd()}\n`, "utf8");
}

export async function obfuscateDockerRuntime() {
  const [files, sourceMaps] = await Promise.all([
    Promise.all(targets.map((target) => collectJavaScriptFiles(target.root, target.format))).then(
      (groups) => groups.flat().sort((a, b) => a.path.localeCompare(b.path)),
    ),
    Promise.all(targets.map((target) => collectSourceMapFiles(target.root))).then((groups) =>
      groups.flat().sort(),
    ),
  ]);

  if (files.length === 0) {
    throw new Error("No compiled Docker runtime JavaScript files found to obfuscate.");
  }

  const esbuild = await loadEsbuild();
  for (const file of files) {
    await obfuscateJavaScriptFile(file, esbuild);
  }
  await Promise.all(sourceMaps.map((file) => rm(file, { force: true })));

  return {
    files: files.length,
    sourceMaps: sourceMaps.length,
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (!shouldObfuscateDockerRuntime()) {
    console.log("Skipping Docker runtime obfuscation; ROME_DOCKER_APP_CODE_MODE is not compiled.");
    process.exit(0);
  }

  try {
    const result = await obfuscateDockerRuntime();
    console.log(
      `Obfuscated Docker runtime JavaScript (${result.files} files, removed ${result.sourceMaps} source maps).`,
    );
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}

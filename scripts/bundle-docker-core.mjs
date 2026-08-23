#!/usr/bin/env node
import { cp, readdir, stat } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const coreRoot = resolve(projectRoot, "packages/core");
// Static template trees copied into core/dist so the published runtime can find
// them. The app templates back `op: "create"`; the memory template seeds a fresh
// profile's memory/ dir on first boot (MEMORY.md, IDENTITY.md, relationship/,
// etc.). Keep in sync with getAppTemplateDir() in paths.ts and
// getMemoryTemplateDir() in profile-memory.ts.
const bundledTemplates = [
  ["packages/app-template/template", "dist/app-template", "app template"],
  ["packages/app-template/workflow", "dist/app-template-workflow", "app template"],
  ["packages/core/memory.example", "dist/memory.example", "memory template"],
];
const esbuildModuleCandidates = [
  resolve(projectRoot, "node_modules/esbuild/lib/main.js"),
  resolve(projectRoot, "packages/desktop/node_modules/esbuild/lib/main.js"),
];

async function pathExists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function findEsbuildModuleCandidates() {
  const pnpmDir = resolve(projectRoot, "node_modules/.pnpm");
  const pnpmCandidates = [];

  try {
    const entries = await readdir(pnpmDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory() && entry.name.startsWith("esbuild@")) {
        pnpmCandidates.push(resolve(pnpmDir, entry.name, "node_modules/esbuild/lib/main.js"));
      }
    }
  } catch {
    // Fall back to the normal workspace symlink candidates.
  }

  return [...esbuildModuleCandidates, ...pnpmCandidates.sort().reverse()];
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

  throw new Error("Unable to load workspace esbuild dependency for Docker core bundling.");
}

if (process.env.ROME_DOCKER_APP_CODE_MODE !== "compiled") {
  console.log("Skipping Docker core bundling; ROME_DOCKER_APP_CODE_MODE is not compiled.");
  process.exit(0);
}

const sharedConfig = {
  bundle: true,
  platform: "node",
  target: "node24",
  format: "esm",
  packages: "external",
  sourcemap: false,
  legalComments: "none",
  logLevel: "info",
};

const entrypoints = [
  ["src/index.ts", "dist/index.js"],
  ["src/daemon/index.ts", "dist/daemon/index.js"],
  ["src/actions/worker.ts", "dist/actions/worker.js"],
];

const { build } = await loadEsbuild();

await Promise.all(
  entrypoints.map(([entry, outfile]) =>
    build({
      ...sharedConfig,
      entryPoints: [resolve(coreRoot, entry)],
      outfile: resolve(coreRoot, outfile),
    }),
  ),
);

for (const [srcRel, destRel, label] of bundledTemplates) {
  const src = resolve(projectRoot, srcRel);
  const dest = resolve(coreRoot, destRel);
  if (!(await pathExists(src))) {
    throw new Error(`Expected ${label} at ${src} but it does not exist; aborting bundle.`);
  }
  await cp(src, dest, { recursive: true });
  console.log(`Copied ${label} → ${dest}`);
}

console.log(`Bundled Docker core entrypoints (${entrypoints.length} files).`);

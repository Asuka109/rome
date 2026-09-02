#!/usr/bin/env node
/**
 * Builds a UX audit report into `dist-report/index.html`.
 *
 *   node .agents/skills/ux-semantics-audit/report/build.mjs
 *   node .agents/skills/ux-semantics-audit/report/build.mjs --dev     # server on :3300
 *
 * The report lives in the skill but compiles against rome-web, so the build
 * needs two things this script supplies: rsbuild resolved from the workspace's
 * node_modules, and `UX_AUDIT_WEB_DIR` so the config can find `packages/web`
 * without guessing at a path relative to itself.
 */
import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const webDir = resolve(here, "../../../../packages/web");
const dev = process.argv.includes("--dev");

// findings.tsx / repros.tsx are per-audit outputs (gitignored). Seed them from
// the committed examples so a fresh checkout builds; an audit overwrites them.
for (const name of ["findings", "repros"]) {
  const real = join(here, `${name}.tsx`);
  if (!existsSync(real)) {
    copyFileSync(join(here, `${name}.example.tsx`), real);
    console.log(`Seeded ${name}.tsx from ${name}.example.tsx`);
  }
}

const result = spawnSync(
  join(webDir, "node_modules/.bin/rsbuild"),
  [dev ? "dev" : "build", "--config", join(here, "rsbuild.config.ts")],
  { cwd: here, stdio: "inherit", env: { ...process.env, UX_AUDIT_WEB_DIR: webDir } },
);

if (result.error) {
  console.error(
    `\nCould not run rsbuild from ${webDir}. Run \`pnpm install\` at the repo root first.`,
  );
  process.exit(1);
}
if (result.status !== 0) process.exit(result.status ?? 1);
if (!dev) console.log(`\nReport written to ${join(here, "dist-report/index.html")}`);

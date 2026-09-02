#!/usr/bin/env node
/**
 * Typechecks the report.
 *
 *   node .agents/skills/ux-semantics-audit/report/typecheck.mjs
 *
 * Same shape as build.mjs and for the same reason: tsc, React's types and the
 * kit's types all resolve from the workspace, not from here.
 */
import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const webDir = resolve(here, "../../../../packages/web");

// findings.tsx / repros.tsx are per-audit outputs (gitignored). Seed them from
// the committed examples so a fresh checkout typechecks; an audit overwrites them.
for (const name of ["findings", "repros"]) {
  const real = join(here, `${name}.tsx`);
  if (!existsSync(real)) {
    copyFileSync(join(here, `${name}.example.tsx`), real);
    console.log(`Seeded ${name}.tsx from ${name}.example.tsx`);
  }
}

const result = spawnSync(join(webDir, "node_modules/.bin/tsc"), ["--noEmit", "-p", here], {
  cwd: here,
  stdio: "inherit",
});

if (result.error) {
  console.error(`\nCould not run tsc from ${webDir}. Run \`pnpm install\` at the repo root first.`);
  process.exit(1);
}
if (result.status === 0) console.log("Report typechecks clean.");
process.exit(result.status ?? 1);

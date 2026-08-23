#!/usr/bin/env node

import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { readRosters, repoRoot } from "./check-utility-tokens.mjs";
import { checkTailwindEntrypoint } from "./tailwind-policy.mjs";
import { radiusUtilityRule } from "./tailwind-rules/radius.mjs";
import { spacingUtilityRule } from "./tailwind-rules/spacing.mjs";

/** Run compiled-utility policy against the dashboard's real Tailwind entrypoint. */
export async function findTailwindPolicyViolations(root = repoRoot) {
  const webDir = join(root, "packages", "web");
  const { spacing } = await readRosters(root);
  const { violations } = await checkTailwindEntrypoint({
    entry: join(webDir, "src", "globals.css"),
    base: webDir,
    dependencyRoot: webDir,
    rules: [spacingUtilityRule, radiusUtilityRule],
    context: { spacing },
  });
  return violations;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const violations = await findTailwindPolicyViolations();
  for (const violation of violations) {
    console.error(
      `${violation.rule}: ${violation.candidate} emits ${violation.property}: ` +
        `${violation.value} (${violation.reason})`,
    );
  }
  if (violations.length > 0) process.exitCode = 1;
}

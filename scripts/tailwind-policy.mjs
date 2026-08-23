/**
 * Compile a Tailwind entrypoint in memory, then run repository policy rules
 * against the exact CSS tree Tailwind produced. This deliberately uses the
 * public PostCSS integration instead of reproducing Tailwind's source scanner:
 * automatic detection, imported `@source` directives, inline candidates, and
 * exclusions therefore stay identical to the real build.
 */

import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";

const toolchains = new Map();

async function loadToolchain(dependencyRoot) {
  let toolchain = toolchains.get(dependencyRoot);
  if (toolchain) return toolchain;

  const requireFromPackage = createRequire(join(dependencyRoot, "package.json"));
  const pluginPath = requireFromPackage.resolve("@tailwindcss/postcss");
  const requireFromPlugin = createRequire(pluginPath);

  const [postcssModule, tailwindModule] = await Promise.all([
    import(pathToFileURL(requireFromPlugin.resolve("postcss")).href),
    import(pathToFileURL(pluginPath).href),
  ]);
  toolchain = {
    postcss: postcssModule.default ?? postcssModule,
    tailwindcss: tailwindModule.default ?? tailwindModule,
  };
  toolchains.set(dependencyRoot, toolchain);
  return toolchain;
}

export async function compileTailwindCss({
  entry,
  css = readFileSync(entry, "utf8"),
  base = dirname(entry),
  dependencyRoot = base,
  optimize = false,
}) {
  const { postcss, tailwindcss } = await loadToolchain(dependencyRoot);
  return postcss([tailwindcss({ base, optimize })]).process(css, { from: entry });
}

export async function parseCss(css, { dependencyRoot, from } = {}) {
  if (!dependencyRoot) throw new Error("parseCss requires dependencyRoot");
  const { postcss } = await loadToolchain(dependencyRoot);
  return postcss.parse(css, { from });
}

export async function runTailwindRules(root, rules, context = {}) {
  const violations = [];

  for (const rule of rules) {
    if (!rule?.name || typeof rule.check !== "function") {
      throw new TypeError("a Tailwind policy rule requires name and check");
    }
    await rule.check({
      root,
      context,
      report(violation) {
        violations.push({ rule: rule.name, ...violation });
      },
    });
  }

  return violations;
}

export async function checkTailwindEntrypoint(options) {
  const { rules, context, ...compileOptions } = options;
  const result = await compileTailwindCss(compileOptions);
  return {
    result,
    violations: await runTailwindRules(result.root, rules, context),
  };
}

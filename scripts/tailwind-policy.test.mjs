import assert from "node:assert/strict";
import { join } from "node:path";
import test from "node:test";
import { compileTailwindCss, runTailwindRules } from "./tailwind-policy.mjs";

const repoRoot = join(import.meta.dirname, "..");
const webDir = join(repoRoot, "packages", "web");

test("compiles inline candidates through Tailwind without an application build", async () => {
  const result = await compileTailwindCss({
    entry: join(webDir, "src", "tailwind-policy-fixture.css"),
    css: `
      @import "tailwindcss" source(none);
      @theme inline {
        --spacing-4: var(--rome-space-4);
        --spacing-11: var(--rome-size-44);
      }
      @source inline("p-4 p-11 p-[7px] w-11");
    `,
    base: webDir,
    dependencyRoot: webDir,
  });

  assert.match(result.css, /\.p-4\s*\{[^}]*padding:\s*var\(--rome-space-4\)/s);
  assert.match(result.css, /\.p-11\s*\{[^}]*padding:\s*var\(--rome-size-44\)/s);
  assert.match(result.css, /\.p-\\\[7px\\\]\s*\{[^}]*padding:\s*7px/s);
  assert.match(result.css, /\.w-11\s*\{[^}]*width:\s*var\(--rome-size-44\)/s);
});

test("uses Tailwind's own source discovery and exclusions", async () => {
  const common = `
    @import "tailwindcss" source(none);
    @source "../../../scripts/fixtures/tailwind-policy/*.html";
  `;
  const options = {
    entry: join(webDir, "src", "tailwind-policy-fixture.css"),
    base: webDir,
    dependencyRoot: webDir,
  };

  const included = await compileTailwindCss({ ...options, css: common });
  assert.match(included.css, /\.p-10\\\.5\s*\{[^}]*padding:/s);

  const excluded = await compileTailwindCss({
    ...options,
    css: `${common}\n@source not "../../../scripts/fixtures/tailwind-policy/*.html";`,
  });
  assert.doesNotMatch(excluded.css, /\.p-10\\\.5\s*\{/);
});

test("runs independent policy rules against the same compiled tree", async () => {
  const calls = [];
  const root = { type: "root" };
  const violations = await runTailwindRules(
    root,
    [
      {
        name: "first",
        check({ root: received, report }) {
          assert.equal(received, root);
          calls.push("first");
          report({ message: "one" });
        },
      },
      {
        name: "second",
        check() {
          calls.push("second");
        },
      },
    ],
    {},
  );

  assert.deepEqual(calls, ["first", "second"]);
  assert.deepEqual(violations, [{ rule: "first", message: "one" }]);
});

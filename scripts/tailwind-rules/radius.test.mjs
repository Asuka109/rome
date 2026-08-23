import assert from "node:assert/strict";
import { join } from "node:path";
import test from "node:test";
import { checkTailwindEntrypoint, parseCss, runTailwindRules } from "../tailwind-policy.mjs";
import { classifyRadiusDeclaration, radiusUtilityRule } from "./radius.mjs";

const webDir = join(import.meta.dirname, "..", "..", "packages", "web");

async function violationsFor(css) {
  const root = await parseCss(css, { dependencyRoot: webDir });
  return runTailwindRules(root, [radiusUtilityRule], {});
}

test("checks candidates after Tailwind compiles them in memory", async () => {
  const { violations } = await checkTailwindEntrypoint({
    entry: join(webDir, "src", "tailwind-policy-fixture.css"),
    css: `
      @import "tailwindcss" source(none);
      @theme inline {
        --radius-8: var(--rome-radius-8);
        --radius-full: var(--rome-radius-full);
      }
      @source inline("rounded-8 rounded-t-8 rounded-full rounded-none rounded-md rounded-[7px] rounded-[var(--control-r-md)] rounded-(--cell-radius)");
    `,
    base: webDir,
    dependencyRoot: webDir,
    rules: [radiusUtilityRule],
  });

  assert.deepEqual(
    violations.map(({ candidate, reason }) => [candidate, reason]),
    [
      ["rounded-(--cell-radius)", "off-roster radius token"],
      ["rounded-[7px]", "arbitrary radius"],
      ["rounded-md", "legacy radius ladder"],
    ],
  );
});

test("checks radius utilities expanded under custom selectors by @apply", async () => {
  const { violations } = await checkTailwindEntrypoint({
    entry: join(webDir, "src", "tailwind-policy-fixture.css"),
    css: `
      @import "tailwindcss" source(none);
      @theme inline {
        --radius-8: var(--rome-radius-8);
      }
      .allowed { @apply rounded-8; }
      .legacy { @apply rounded-md; }
      .arbitrary { @apply rounded-[7px]; }
    `,
    base: webDir,
    dependencyRoot: webDir,
    rules: [radiusUtilityRule],
  });

  assert.deepEqual(
    violations.map(({ candidate, reason }) => [candidate, reason]),
    [
      ["rounded-md", "legacy radius ladder"],
      ["rounded-[7px]", "arbitrary radius"],
    ],
  );
});

test("rejects the ladder, literals, and off-roster reads on every corner property", async () => {
  const violations = await violationsFor(
    [
      ".rounded-8{border-radius:var(--rome-radius-8)}",
      ".rounded-t-4{border-top-left-radius:var(--rome-radius-4);border-top-right-radius:var(--rome-radius-4)}",
      ".rounded-e-full{border-start-end-radius:var(--rome-radius-full);border-end-end-radius:var(--rome-radius-full)}",
      ".rounded-none{border-radius:0}",
      ".sm\\:rounded-8{border-radius:var(--rome-radius-8)}",
      ".rounded-lg{border-radius:var(--radius)}",
      ".rounded-sm{border-radius:calc(var(--radius) - 4px)}",
      ".rounded-2xl{border-radius:var(--radius-2xl)}",
      ".rounded-\\[13px\\]{border-radius:13px}",
      ".rounded-\\[9999px\\]{border-radius:9999px}",
      ".rounded-b-\\[6px\\]{border-bottom-right-radius:6px;border-bottom-left-radius:6px}",
      ".rounded-\\(--cell-radius\\){border-radius:var(--cell-radius)}",
      ".rounded-\\[calc\\(var\\(--rome-radius-8\\)\\+1px\\)\\]{border-radius:calc(var(--rome-radius-8) + 1px)}",
    ].join(""),
  );

  assert.deepEqual(
    violations.map(({ candidate, reason }) => [candidate, reason]),
    [
      ["rounded-lg", "legacy radius ladder"],
      ["rounded-sm", "legacy radius ladder"],
      ["rounded-2xl", "legacy radius ladder"],
      ["rounded-[13px]", "arbitrary radius"],
      ["rounded-[9999px]", "arbitrary radius"],
      ["rounded-b-[6px]", "arbitrary radius"],
      ["rounded-(--cell-radius)", "off-roster radius token"],
      ["rounded-[calc(var(--rome-radius-8)+1px)]", "off-roster radius token"],
    ],
  );
});

test("allows roster reads, control aliases, zero, and the corner shorthand", async () => {
  assert.deepEqual(
    await violationsFor(
      [
        ".rounded-4{border-radius:var(--rome-radius-4)}",
        ".rounded-full{border-radius:var(--rome-radius-full)}",
        ".rounded-t-none{border-top-left-radius:0;border-top-right-radius:0}",
        ".rounded-control{border-radius:var(--control-r-md)}",
        ".rounded-seam{border-radius:var(--rome-radius-8) var(--rome-radius-8) 0 0}",
        ".rounded-inherit{border-radius:inherit}",
      ].join(""),
    ),
    [],
  );
});

test("classifies a declaration by the roster its corners read", () => {
  const classify = (value) =>
    classifyRadiusDeclaration({ candidate: "rounded-x", property: "border-radius", value });

  for (const value of [
    "var(--rome-radius-8)",
    "var(--control-r-sm)",
    "var(--rome-radius-full) var(--rome-radius-full) 0 0",
    "0",
    "inherit",
  ]) {
    assert.equal(classify(value), null, value);
  }

  // A fallback renders whenever the name is undeclared, so a literal one puts
  // a raw value on the page behind a reference that looks like a token read.
  assert.equal(classify("var(--rome-radius-8, 7px)"), "arbitrary radius");
  assert.equal(classify("var(--radius-md, 7px)"), "arbitrary radius");
  // The scale is closed, so an invented name cannot ride the namespace in.
  assert.equal(classify("var(--rome-radius-24)"), "off-roster radius token");
  assert.equal(classify("var(--control-r-xl)"), "off-roster radius token");
  // Derivation happens once, in the scale.
  assert.equal(classify("calc(var(--rome-radius-8) + 1px)"), "off-roster radius token");
  assert.equal(classify("var(--radius)"), "legacy radius ladder");
  assert.equal(classify("50%"), "arbitrary radius");
});

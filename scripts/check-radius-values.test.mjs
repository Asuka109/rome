import assert from "node:assert/strict";
import test from "node:test";
import { baselineKey, classifyValue, findViolations, scanRoots } from "./check-radius-values.mjs";
import { baselineKeys } from "./radius-values-baseline.mjs";

test("every raw border-radius value is a var() over a radius token", () => {
  const unlisted = findViolations().filter((v) => !baselineKeys.has(baselineKey(v)));

  assert.deepEqual(
    unlisted.map((v) => `${v.file}:${v.line}  ${v.value}`),
    [],
    "Off-system border-radius: a corner comes from the scale, not a raw value.\n" +
      "Use a roster utility (rounded-8, rounded-full) or read a radius token\n" +
      "(var(--rome-radius-8), var(--control-r-md)). A corner between two steps\n" +
      "takes the nearer step; a repeated need for a missing step is a scale\n" +
      "decision for docs/ui/primitive-token/border-radius-primitives.md.",
  );
});

test("the baseline holds no entry that has already been fixed", () => {
  const live = new Set(findViolations().map(baselineKey));
  const stale = [...baselineKeys].filter((key) => !live.has(key));

  assert.deepEqual(
    stale,
    [],
    "Fixed border-radius still listed in radius-values-baseline.mjs — delete these entries.",
  );
});

test("scans the kit, the dashboard, and every first-party app web bundle", () => {
  const { fixed, apps } = scanRoots();

  // The kit, the dashboard, the SDK runtime, and the two app scaffolds.
  assert.equal(fixed.length, 5);
  // A gate that scans nothing passes, so a change to the `src/web` convention
  // has to fail here rather than silently narrow coverage to zero apps.
  assert.ok(apps.length >= 5, `expected first-party app web bundles, found ${apps.length}`);
});

test("classifies a value by whether it reads the radius canon", () => {
  for (const value of [
    "var(--rome-radius-8)",
    "var(--rome-radius-full)",
    "var(--control-r-md)",
    // The shorthand rounds each corner alone; zero squares a shared seam.
    "var(--rome-radius-full) var(--rome-radius-full) 0 0",
    "0",
    "inherit",
    // Not a literal, so the scanner can't judge it either way.
    "props.radius",
  ]) {
    assert.equal(classifyValue(value), "allowed", value);
  }

  for (const value of [
    "13px",
    "7px 7px 0 0",
    '"12px"',
    // React renders a bare number as px, so this is the same drift as "12px".
    "12",
    "2rem",
    "50%",
    // The near-full literal `--rome-radius-full` exists to replace.
    "9999px",
    // The legacy shadcn ladder is a compatibility contract, not the roster.
    "var(--radius)",
    "var(--radius-md)",
    // Derivation happens once, in the scale.
    "calc(var(--rome-radius-8) + 1px)",
    // The scale is closed, so an invented name cannot ride the namespace in.
    "var(--rome-radius-9999)",
    "var(--control-r-xl)",
  ]) {
    assert.equal(classifyValue(value), "violation", value);
  }
});

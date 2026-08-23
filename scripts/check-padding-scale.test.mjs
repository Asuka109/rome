import assert from "node:assert/strict";
import test from "node:test";
import { baselineKey, classifyValue, findViolations, scanRoots } from "./check-padding-scale.mjs";
import { baselineKeys } from "./padding-scale-baseline.mjs";

test("every padding value is a spacing step or a token", () => {
  const unlisted = findViolations().filter((v) => !baselineKeys.has(baselineKey(v)));

  assert.deepEqual(
    unlisted.map((v) => `${v.file}:${v.line}  ${v.value}`),
    [],
    "Off-system padding: a raw length can't be retuned from the design system.\n" +
      "Use a spacing step (p-4, py-1.5) or a token (px-[var(--control-px-md)]).\n" +
      "If neither fits, the value belongs in a named token — add it to\n" +
      "packages/ui/src/styles.css and reference it here.",
  );
});

test("the baseline holds no entry that has already been fixed", () => {
  const live = new Set(findViolations().map(baselineKey));
  const stale = [...baselineKeys].filter((key) => !live.has(key));

  assert.deepEqual(
    stale,
    [],
    "Fixed padding still listed in padding-scale-baseline.mjs — delete these entries.",
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

test("classifies a value by whether the design system can retune it", () => {
  for (const value of [
    "var(--control-px-md)",
    "calc(var(--control-px-md) - 4px)",
    "max(var(--rome-safe-area-bottom), 1rem)",
    "var(--field-px-${token})",
    "0",
    "inherit",
    // Not a literal, so the scanner can't judge it either way.
    "spacing[2]",
  ]) {
    assert.equal(classifyValue(value), "allowed", value);
  }

  for (const value of [
    "18px",
    "0.7rem 1rem",
    '"32px"',
    "6px 9px",
    "clamp(1rem, 2vw, 1.75rem)",
    // React renders a bare number as px, so this is the same drift as "16px".
    "16",
    "0.5",
    // Units newer than the classic set are still lengths.
    "4dvh",
    "2cqi",
    "3rlh",
  ]) {
    assert.equal(classifyValue(value), "violation", value);
  }
});

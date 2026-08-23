/**
 * A raw `border-radius:` declaration must read the radius canon; a literal
 * corner is off-system because nothing downstream can retune it. Scale
 * rationale: `docs/ui/primitive-token/border-radius-primitives.md`.
 *
 * `check-utility-tokens.mjs` owns the class-form half of this dimension — it
 * Tailwind-compiles `rounded-*` candidates and judges the declaration. What
 * that mechanism cannot see is a `border-radius:` written directly in a
 * stylesheet or an inline `borderRadius` style object, so this sibling reads
 * those values over the same roots. The rule is stricter than the spacing
 * sibling's: any `var()` satisfies a padding, but a corner must read a
 * `--rome-radius-*` or `--control-r-*` name exactly, because arithmetic over a
 * step derives a corner and derivation happens once, in the scale.
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import {
  RAW_LENGTH,
  UNITLESS_NUMBER,
  blankComments,
  repoRoot,
  scanRoots,
} from "./check-padding-scale.mjs";
import { RADIUS_KEYWORD, RADIUS_TOKEN_READ } from "./tailwind-rules/radius.mjs";

export { repoRoot, scanRoots };

// `vendor` holds third-party copies whose geometry we can't act on.
const SKIP_DIRS = new Set(["node_modules", "dist", "build", "coverage", "vendor"]);

const SOURCE_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".mjs"];

// Tests assert the values their source produces, so scanning both counts one
// violation twice and overstates the baseline.
const isTest = (name) => /\.(test|spec)\.[cm]?[jt]sx?$/.test(name);

const RADIUS_PROPERTIES = [
  "border-radius",
  "border-top-left-radius",
  "border-top-right-radius",
  "border-bottom-right-radius",
  "border-bottom-left-radius",
  "border-start-start-radius",
  "border-start-end-radius",
  "border-end-start-radius",
  "border-end-end-radius",
];

const camel = (property) => property.replace(/-([a-z])/g, (_, c) => c.toUpperCase());

/** Matches `border-radius: 7px;` in a stylesheet. */
const CSS_DECLARATION = new RegExp(
  String.raw`(?:^|[;{\s])(${RADIUS_PROPERTIES.join("|")})\s*:\s*([^;}\n]+)`,
  "g",
);

/** Matches `borderRadius: "12px"` in a style object and `border-radius: 7px;` in a CSS template literal. */
const STYLE_PROPERTY = new RegExp(
  String.raw`\b(${[...RADIUS_PROPERTIES, ...RADIUS_PROPERTIES.map(camel)].join("|")})\s*:\s*([^,;\n}]+)`,
  "g",
);

/**
 * `"allowed"` when every corner reads the canon. The shorthand takes up to four
 * corners and an elliptical `/` split, so each component judges alone.
 */
export function classifyValue(rawValue) {
  const value = rawValue
    .trim()
    .replace(/^["'`]|["'`]$/g, "")
    .trim();

  if (value === "") return "allowed";
  const parts = value.split(/[\s/]+/).filter(Boolean);
  if (parts.every((part) => RADIUS_TOKEN_READ.test(part) || RADIUS_KEYWORD.test(part))) {
    return "allowed";
  }
  // A reference that is not a clean canon read: the legacy `--radius` ladder,
  // a name outside the roster, or arithmetic over a step.
  if (value.includes("var(--")) return "violation";
  // `%` sits before `\b` in RAW_LENGTH, which can never match at a value's
  // end, and a percentage corner (`50%` circles) is this dimension's staple.
  if (RAW_LENGTH.test(value) || /\d\s*%/.test(value)) return "violation";
  // `borderRadius: 12` is off-system exactly as `"12px"` is; only zero
  // carries no corner to retune.
  if (UNITLESS_NUMBER.test(value)) return Number(value) === 0 ? "allowed" : "violation";
  // Keywords the regexes above don't name, and anything the scanner can't
  // resolve to a literal.
  return "allowed";
}

function scanFile(absolutePath, relativePath) {
  const isStylesheet = relativePath.endsWith(".css");
  const text = blankComments(readFileSync(absolutePath, "utf8"), isStylesheet);
  const violations = [];

  const lineOf = (index) => text.slice(0, index).split("\n").length;

  const declarationPattern = isStylesheet ? CSS_DECLARATION : STYLE_PROPERTY;
  for (const match of text.matchAll(declarationPattern)) {
    const value = match[2].trim();
    if (classifyValue(value) === "violation") {
      violations.push({
        file: relativePath,
        line: lineOf(match.index),
        value: `${match[1]}: ${value}`,
      });
    }
  }

  return violations;
}

function* walk(dir) {
  // Dirents rather than statSync: a symlink cycle under a scanned root would
  // recurse until the stack blew, and a dangling one would throw.
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const absolutePath = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      yield* walk(absolutePath);
      continue;
    }
    if (!entry.isFile()) continue;
    if (isTest(entry.name)) continue;
    if (entry.name.endsWith(".css") || SOURCE_EXTENSIONS.some((ext) => entry.name.endsWith(ext))) {
      yield absolutePath;
    }
  }
}

/** Every off-system border-radius value in scope, sorted for stable diffs. */
export function findViolations(root = repoRoot) {
  const { fixed, apps } = scanRoots(root);

  // A moved root would otherwise scan nothing and report the repo clean.
  for (const dir of fixed) {
    if (!existsSync(dir)) {
      throw new Error(`radius scan root is missing: ${relative(root, dir)}`);
    }
  }

  const violations = [];
  for (const dir of [...fixed, ...apps]) {
    for (const absolutePath of walk(dir)) {
      const relativePath = relative(root, absolutePath).split(sep).join("/");
      violations.push(...scanFile(absolutePath, relativePath));
    }
  }
  return violations.sort(
    (a, b) => a.file.localeCompare(b.file) || a.value.localeCompare(b.value) || a.line - b.line,
  );
}

/** Keyed by file and value, never line: a line number churns on every edit above it. */
export const baselineKey = ({ file, value }) => `${file} :: ${value}`;

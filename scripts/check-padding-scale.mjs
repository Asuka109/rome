/**
 * Padding must be a Tailwind spacing step or a token; a raw length is off-system
 * because nothing downstream can retune it. Which steps are sanctioned is
 * `check-utility-tokens.mjs`'s question. This gate reads values, that one reads
 * class names against the roster in `packages/ui/src/styles.css`.
 *
 * Scope is the kit's declared consumers, per `docs/ui-kit.md`. Server-
 * rendered standalone HTML (email, OAuth callback, gateway) is out: it never
 * loads the kit stylesheet, and email clients don't resolve custom properties,
 * so the rule would be unfollowable there rather than merely unmet.
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";

export const repoRoot = join(import.meta.dirname, "..");

/** App bundles are discovered rather than listed, so a new app is covered on sight. */
export function scanRoots(root = repoRoot) {
  const fixed = [
    join(root, "packages", "ui", "src"),
    join(root, "packages", "web", "src"),
    // The SDK runtime `@source`s its own components into every app bundle, so
    // its geometry ships to app surfaces the same way the kit's does.
    join(root, "packages", "app-web-sdk", "src", "runtime"),
    // The scaffolds are copied verbatim into every new app, so a value here
    // seeds each one.
    join(root, "packages", "app-template", "template", "src", "web"),
    join(root, "packages", "app-template", "workflow", "src", "web"),
  ];

  const appsDir = join(root, "rome_apps");
  const apps = existsSync(appsDir)
    ? readdirSync(appsDir)
        .map((app) => join(appsDir, app, "src", "web"))
        .filter((dir) => existsSync(dir))
    : [];

  return { fixed, apps };
}

// `vendor` holds third-party copies whose geometry we can't act on.
const SKIP_DIRS = new Set(["node_modules", "dist", "build", "coverage", "vendor"]);

const SOURCE_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".mjs"];

// Tests assert the class strings their source produces, so scanning both counts
// one violation twice and overstates the baseline.
const isTest = (name) => /\.(test|spec)\.[cm]?[jt]sx?$/.test(name);

const PADDING_PROPERTIES = [
  "padding",
  "padding-top",
  "padding-right",
  "padding-bottom",
  "padding-left",
  "padding-inline",
  "padding-inline-start",
  "padding-inline-end",
  "padding-block",
  "padding-block-start",
  "padding-block-end",
];

const camel = (property) => property.replace(/-([a-z])/g, (_, c) => c.toUpperCase());

/** Matches `pl-[38px]`, `px-[var(--field-px-md)]`, `pb-[calc(…)]`. */
const TAILWIND_ARBITRARY = /\b(p|px|py|pt|pr|pb|pl|ps|pe)-\[([^\]]*)\]/g;

/** Matches `padding: 6px 9px;` in a stylesheet. */
const CSS_DECLARATION = new RegExp(
  String.raw`(?:^|[;{\s])(${PADDING_PROPERTIES.join("|")})\s*:\s*([^;}\n]+)`,
  "g",
);

/** Matches `padding: "32px"` in a style object and `padding: 16px;` in a CSS template literal. */
const STYLE_PROPERTY = new RegExp(
  String.raw`\b(${[...PADDING_PROPERTIES, ...PADDING_PROPERTIES.map(camel)].join("|")})\s*:\s*([^,;\n}]+)`,
  "g",
);

// Longer units lead so a shorter one can't claim their prefix.
const LENGTH_UNITS = [
  "cqmin",
  "cqmax",
  "cqw",
  "cqh",
  "cqi",
  "cqb",
  "svmin",
  "svmax",
  "lvmin",
  "lvmax",
  "dvmin",
  "dvmax",
  "svw",
  "svh",
  "lvw",
  "lvh",
  "dvw",
  "dvh",
  "vmin",
  "vmax",
  "vw",
  "vh",
  "rlh",
  "lh",
  "rem",
  "em",
  "px",
  "ch",
  "ex",
  "pt",
  "pc",
  "in",
  "cm",
  "mm",
  "q",
  "%",
];
export const RAW_LENGTH = new RegExp(String.raw`\d\s*(${LENGTH_UNITS.join("|")})\b`);

/** A bare number, which React renders as `px` on a style object. */
export const UNITLESS_NUMBER = /^-?\d*\.?\d+$/;

/**
 * `"allowed"` when the design system can retune the value centrally. Arithmetic
 * over a token still counts — `calc(var(--x) - 4px)` moves when `--x` moves,
 * where a bare `calc(1rem + 2px)` has nothing to retune.
 */
export function classifyValue(rawValue) {
  const value = rawValue
    .trim()
    .replace(/^["'`]|["'`]$/g, "")
    .trim();

  if (value === "") return "allowed";
  if (value.includes("var(--")) return "allowed";
  if (RAW_LENGTH.test(value)) return "violation";
  // `padding: 16` is off-system exactly as `padding: "16px"` is; only zero
  // carries no length to retune.
  if (UNITLESS_NUMBER.test(value)) return Number(value) === 0 ? "allowed" : "violation";
  // Keywords like `inherit` / `unset` / `revert-layer`, and anything the
  // scanner can't resolve to a literal.
  return "allowed";
}

/**
 * Overwrites comments with spaces, preserving byte offsets so reported line
 * numbers stay true. Prose quoting a padding value would otherwise report as a
 * violation. The `:` guard keeps `https://…` from reading as a line comment.
 */
export function blankComments(text, isStylesheet) {
  const blank = (match) => match.replace(/[^\n]/g, " ");
  const withoutBlocks = text.replace(/\/\*[\s\S]*?\*\//g, blank);
  return isStylesheet
    ? withoutBlocks
    : withoutBlocks.replace(/(^|[^:])\/\/[^\n]*/g, (m, p) => p + blank(m.slice(p.length)));
}

function scanFile(absolutePath, relativePath) {
  const isStylesheet = relativePath.endsWith(".css");
  const text = blankComments(readFileSync(absolutePath, "utf8"), isStylesheet);
  const violations = [];

  const record = (line, snippet) => {
    violations.push({ file: relativePath, line, value: snippet });
  };

  const lineOf = (index) => text.slice(0, index).split("\n").length;

  if (!isStylesheet) {
    for (const match of text.matchAll(TAILWIND_ARBITRARY)) {
      if (classifyValue(match[2]) === "violation") {
        record(lineOf(match.index), `${match[1]}-[${match[2]}]`);
      }
    }
  }

  const declarationPattern = isStylesheet ? CSS_DECLARATION : STYLE_PROPERTY;
  for (const match of text.matchAll(declarationPattern)) {
    const value = match[2].trim();
    if (classifyValue(value) === "violation") {
      record(lineOf(match.index), `${match[1]}: ${value}`);
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

/** Every off-system padding value in scope, sorted for stable diffs. */
export function findViolations(root = repoRoot) {
  const { fixed, apps } = scanRoots(root);

  // A moved root would otherwise scan nothing and report the repo clean.
  for (const dir of fixed) {
    if (!existsSync(dir)) {
      throw new Error(`padding scan root is missing: ${relative(root, dir)}`);
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

export function summarize(violations) {
  const byFile = new Map();
  for (const violation of violations) {
    const list = byFile.get(violation.file) ?? [];
    list.push(violation);
    byFile.set(violation.file, list);
  }
  return byFile;
}

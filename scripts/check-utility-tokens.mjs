/**
 * A utility class must name a token the design system owns. `gap-1.5` is a legal
 * Tailwind utility and an illegal Rome one, because 6px is no step on the scale.
 * Scale rationale: `docs/ui/primitive-token/spacing-primitives.md`.
 *
 * Tailwind compiles each candidate against the dashboard stylesheet, and the
 * declaration decides. An on-roster step resolves to `var(--rome-space-N)`, an
 * off-roster one stays on `calc(var(--spacing) * N)`. A Rome color resolves to a
 * bare `var(--primary)`, Tailwind's own to the `var(--color-*)` namespace. Paint
 * that reaches no variable is a literal, whatever syntax wrote it.
 *
 * `check-padding-scale.mjs` and `check-radius-values.mjs` are the sibling
 * gates over the same roots. They read raw declaration values for whether they
 * can be retuned, this reads every utility for whether it names a token.
 */

import { readdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join, relative, sep } from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";
import { repoRoot, scanRoots } from "./check-padding-scale.mjs";
import {
  LEGACY_RADIUS_NAMESPACE,
  RADIUS_KEYWORD,
  RADIUS_PROPERTIES,
  RADIUS_TOKEN_READ,
} from "./tailwind-rules/radius.mjs";
import { SPACING_PROPERTIES } from "./tailwind-rules/spacing.mjs";

export { repoRoot, scanRoots };

const SKIP_DIRS = new Set(["node_modules", "dist", "build", "coverage"]);

// A class table lives in a `.ts` module as readily as in a component.
const SOURCE_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".mjs"];

// A test asserts the class strings its source produces, so scanning both
// double-counts.
const isTest = (name) => /\.(test|spec)\.[cm]?[jt]sx?$/.test(name);

/**
 * Candidates intentionally removed from generated bundles. Tailwind returns no
 * CSS for these, which is otherwise indistinguishable from arbitrary prose.
 * Keep them visible to the source gate so authored classes cannot silently lose
 * their styles merely because the dependency candidate was denied.
 */
const DENIED_CANDIDATE_REASONS = new Map([
  ["p-1.5", "off-scale spacing"],
  ["px-1.5", "off-scale spacing"],
  ["py-0.5", "off-scale spacing"],
  ["text-2xs", "stock text size"],
  ["rounded", "arbitrary radius"],
  ["rounded-md", "legacy radius ladder"],
  ["rounded-lg", "legacy radius ladder"],
  ["rounded-xl", "legacy radius ladder"],
]);

/**
 * The padding families the sibling gate owns. `scroll-padding` is not one of
 * them, so an arbitrary literal there stays this gate's finding.
 */
const PADDING_PROPERTY = /^padding/;

const COLOR_PROPERTIES = new Set([
  "color",
  "background-color",
  "border-color",
  "border-top-color",
  "border-right-color",
  "border-bottom-color",
  "border-left-color",
  "border-inline-color",
  "border-block-color",
  "outline-color",
  "text-decoration-color",
  "caret-color",
  "accent-color",
  "fill",
  "stroke",
  // A gradient carries its stops inline, so a literal one is paint reaching no
  // token. The shorthands (`border`, `outline`, `font`) are deliberately absent:
  // separating their paint from their lengths and keywords needs a CSS value
  // parser, and `outline-hidden` alone would misread as nine violations.
  "background-image",
]);

/**
 * Tailwind routes ring, gradient, and shadow paint through custom properties.
 * Any `--tw-*-color` counts, so a namespace the framework adds later still lands.
 */
const COLOR_CUSTOM_PROPERTY = /^--tw-(?:.+-)?color$|^--tw-gradient-(?:from|via|to)$/;

/** A step Tailwind could not resolve to a named theme entry. */
const OFF_ROSTER_STEP = /calc\(\s*var\(\s*--spacing\s*\)/;

/** Tailwind's own theme namespace. Rome's `@theme inline` resolves to bare names. */
const STOCK_NAMESPACE = /var\(\s*--color-/;

const VAR_REFERENCE = /var\(\s*(--[a-z0-9-]+)/gi;

/**
 * A token reference carrying its own fallback, as in `var(--missing, 6px)`. The
 * fallback renders whenever the name is undeclared, so a literal one puts a raw
 * value on the page through a reference that looks like a token read.
 */
const LITERAL_FALLBACK = /var\(\s*--[a-z0-9-]+\s*,\s*([^)]+)\)/i;

/**
 * Tailwind writes its own fallbacks into these, so a literal there is the
 * framework's default rather than an authored value.
 */
const TAILWIND_COMPOSITE = /^--tw-/;

const hasLiteralFallback = (property, value) => {
  if (TAILWIND_COMPOSITE.test(property)) return false;
  const fallback = value.match(LITERAL_FALLBACK);
  return Boolean(fallback) && !fallback[1].includes("var(");
};

/** Paint carrying no color: the keywords, and the image reference `fill` takes. */
const KEYWORD_PAINT = /^(?:transparent|currentcolor|inherit|initial|unset|none|revert)$|^url\(/i;

/** Values that do not participate in the spacing rhythm. */
const KEYWORD_LENGTH = /^(?:auto|inherit|initial|unset|revert|-?0(?:px)?|-?1px)$/i;

/**
 * Declarations in a compiled rule, including those nested inside a variant.
 * Anchored to a declaration's start, so the escaped colon every variant selector
 * carries cannot read as a property.
 */
const DECLARATION = /(?<=[{;]\s*)(-{0,2}[a-z][a-z0-9-]*)\s*:\s*([^;{}]+)/gi;

/**
 * Tailwind's compiler, loaded against the dashboard stylesheet so a candidate
 * resolves through the theme the app ships. Resolution runs from `packages/web`,
 * the workspace that owns the entry point and depends on Tailwind.
 */
export async function loadDesignSystem(root = repoRoot) {
  const webDir = join(root, "packages", "web");
  const entry = join(webDir, "src", "globals.css");
  const require_ = createRequire(join(webDir, "noop.js"));

  const tailwind = await import(pathToFileURL(require_.resolve("tailwindcss")).href);
  const load =
    tailwind.__unstable__loadDesignSystem ?? tailwind.default?.__unstable__loadDesignSystem;
  if (typeof load !== "function") {
    throw new Error(
      "tailwindcss does not expose __unstable__loadDesignSystem — this gate compiles " +
        "candidates through it, and cannot judge a class without it",
    );
  }

  const resolve = (id, base) => {
    if (id.startsWith(".")) return join(base, id);
    if (id === "tailwindcss") return require_.resolve("tailwindcss/index.css");
    return require_.resolve(id);
  };

  return load(readFileSync(entry, "utf8"), {
    base: join(webDir, "src"),
    loadStylesheet: async (id, base) => {
      const path = resolve(id, base);
      return { base: join(path, ".."), path, content: readFileSync(path, "utf8") };
    },
    // The typography plugin contributes prose classes, not tokens.
    loadModule: async () => ({ module: () => {}, base: webDir }),
  });
}

/**
 * The names a component may not reach for. Throws on an empty roster, which would
 * mark every class off-system or none of them.
 */
export async function readRosters(root = repoRoot) {
  const styles = readFileSync(join(root, "packages", "ui", "src", "styles.css"), "utf8");
  const roles = new Set([...styles.matchAll(/--text-([a-z]+):/g)].map((match) => match[1]));

  // The raw value layer. A component reading one directly breaks the aliasing
  // direction in docs/authoring/ui-tokens.md. The spacing steps are excluded, because
  // `--rome-space-*` is what the sanctioned spacing utilities compile to.
  const primitives = new Set(
    [...styles.matchAll(/^\s*(--rome-(?:size|radius)-[a-z0-9-]+)\s*:/gm)]
      .map((match) => match[1])
      .filter((name) => !name.startsWith("--rome-space-")),
  );

  const readSpacingSteps = (path) => {
    const source = readFileSync(path, "utf8");
    const sourceFile = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true);
    let steps = null;

    const visit = (node) => {
      if (
        ts.isVariableDeclaration(node) &&
        ts.isIdentifier(node.name) &&
        node.name.text === "SPACING_STEPS" &&
        node.initializer
      ) {
        const expression = ts.isAsExpression(node.initializer)
          ? node.initializer.expression
          : node.initializer;
        if (ts.isArrayLiteralExpression(expression)) {
          steps = expression.elements.map((element) =>
            ts.isNumericLiteral(element) ? Number(element.text) : Number.NaN,
          );
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(sourceFile);

    if (!steps || steps.length === 0 || steps.some((step) => !Number.isInteger(step))) {
      throw new Error(`SPACING_STEPS is missing or invalid in ${relative(root, path)}`);
    }
    return steps;
  };

  const primitiveSpacing = readSpacingSteps(
    join(root, "packages", "ui", "src", "spacing-primitives.test.ts"),
  );
  const bindingSpacing = readSpacingSteps(
    join(root, "packages", "ui", "src", "spacing-binding.test.ts"),
  );
  if (primitiveSpacing.join(",") !== bindingSpacing.join(",")) {
    throw new Error(
      "the UI spacing primitive and binding rosters differ — update both constants in one change",
    );
  }
  const spacing = new Set(primitiveSpacing);

  // Color primitives are theme data, not CSS. Rather than pattern-match the
  // source (which would fail open on an unmatched spelling or a truncated
  // body), evaluate the module — it is a self-contained data file — and read
  // the palette names each built-in theme actually emits.
  const themesTs = readFileSync(join(root, "packages", "web", "src", "lib", "themes.ts"), "utf8");
  const { outputText } = ts.transpileModule(themesTs, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  });
  // A data: module cannot resolve imports, so this evaluation only works while
  // themes.ts stays self-contained. Type-only imports are erased by the
  // transpile; a surviving value import gets a legible error here rather than
  // an opaque resolution failure from the import below.
  if (/^\s*import\s/m.test(outputText)) {
    throw new Error(
      "themes.ts now carries a value import — the roster evaluates it as a data: module, " +
        "which cannot resolve dependencies. Inline the dependency or load the module " +
        "through an import-resolving loader here.",
    );
  }
  const themesUrl = `data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`;
  const { BUILTIN_THEMES } = await import(themesUrl);
  for (const theme of BUILTIN_THEMES) {
    const names = Object.keys(theme.palette);
    if (names.length === 0) {
      throw new Error(
        `theme "${theme.id}" emits an empty palette — the roster would silently lose ` +
          `its color primitives`,
      );
    }
    for (const name of names) primitives.add(`--${name}`);
  }

  for (const [name, roster, source] of [
    ["typography roles", roles, "packages/ui/src/styles.css"],
    ["primitive tokens", primitives, "packages/ui/src/styles.css + packages/web/src/lib/themes.ts"],
  ]) {
    if (roster.size === 0) {
      throw new Error(
        `no ${name} found in ${source} — the roster moved, and this gate would pass or ` +
          `fail every class at random until it is repointed`,
      );
    }
  }

  return { roles, primitives, spacing };
}

/** The alpha channel Tailwind wraps around authored paint. */
const FRAMEWORK_ALPHA = /^--tw-.*-alpha$/;

/**
 * The tokens a value reads. The alpha channel is left out, because Tailwind
 * injects it around an authored literal, as in
 * `color-mix(in oklab, #fff var(--tw-shadow-alpha), transparent)`, and counting
 * it would read that literal as token-backed.
 */
const referencedNames = (value) =>
  [...value.matchAll(VAR_REFERENCE)]
    .map((match) => match[1])
    .filter((name) => !FRAMEWORK_ALPHA.test(name));

/**
 * The reason the compiled CSS is off-system, or `null`. A declaration the rosters
 * have no opinion on returns `null`, so a guess cannot bury a certain finding.
 */
export function classifyCss(css, rosters) {
  for (const [, property, rawValue] of css.matchAll(DECLARATION)) {
    const name = property.toLowerCase();
    const value = rawValue.trim();

    if (SPACING_PROPERTIES.has(name)) {
      if (OFF_ROSTER_STEP.test(value)) return "off-scale spacing";
      if (hasLiteralFallback(name, value)) return "arbitrary spacing";
      if (value.includes("var(") || KEYWORD_LENGTH.test(value)) continue;
      // An arbitrary padding literal is `check-padding-scale.mjs`'s finding.
      if (PADDING_PROPERTY.test(name)) continue;
      return "arbitrary spacing";
    }

    if (RADIUS_PROPERTIES.has(name)) {
      if (hasLiteralFallback(name, value)) return "arbitrary radius";
      // The shorthand takes up to four corners and an elliptical `/` split, so
      // each component judges alone: every one must be a token read or zero.
      const parts = value.split(/[\s/]+/).filter(Boolean);
      if (parts.every((part) => RADIUS_TOKEN_READ.test(part) || RADIUS_KEYWORD.test(part))) {
        continue;
      }
      const names = referencedNames(value);
      if (names.some((token) => LEGACY_RADIUS_NAMESPACE.test(token))) {
        return "legacy radius ladder";
      }
      if (names.length > 0) return "off-roster radius token";
      return "arbitrary radius";
    }

    if (COLOR_PROPERTIES.has(name) || COLOR_CUSTOM_PROPERTY.test(name)) {
      const names = referencedNames(value);
      if (names.some((token) => rosters.primitives.has(token))) return "primitive token read";
      if (STOCK_NAMESPACE.test(value)) return "stock palette color";
      if (hasLiteralFallback(name, value)) return "arbitrary color";
      if (names.length > 0 || KEYWORD_PAINT.test(value)) continue;
      return "arbitrary color";
    }

    if (name === "font-size") {
      const role = value.match(/var\(\s*--text-([a-z0-9-]+)\s*\)/i);
      if (role) {
        if (rosters.roles.has(role[1])) continue;
        return "stock text size";
      }
      if (hasLiteralFallback(name, value)) return "arbitrary font size";
      if (value.includes("var(")) continue;
      return "arbitrary font size";
    }
  }

  return null;
}

/** Judge one source candidate, including candidates the stylesheet denies. */
export function classifyCandidate(candidate, css, rosters) {
  return DENIED_CANDIDATE_REASONS.get(candidate) ?? (css ? classifyCss(css, rosters) : null);
}

/**
 * Every string literal in a source text, with the line it sits on. A class list
 * is written as a ternary, a concatenation, a template literal, or a lookup
 * table, not only as a plain attribute. This reads them all rather than matching
 * each shape. A literal that compiles to no utility classifies as nothing.
 */
export function stringLiterals(code) {
  const sourceFile = ts.createSourceFile(
    "scan.tsx",
    code,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const found = [];

  const visit = (node) => {
    if (
      ts.isStringLiteral(node) ||
      ts.isNoSubstitutionTemplateLiteral(node) ||
      ts.isTemplateHead(node) ||
      ts.isTemplateMiddle(node) ||
      ts.isTemplateTail(node)
    ) {
      const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
      found.push({ line: line + 1, text: node.text });
    }
    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return found;
}

function* walk(dir, { includeVendor = false } = {}) {
  // Dirents rather than statSync: a symlink cycle would recurse until the stack
  // blew, and a dangling one would throw.
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const absolutePath = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name) || (entry.name === "vendor" && !includeVendor)) continue;
      yield* walk(absolutePath, { includeVendor });
      continue;
    }
    if (!entry.isFile()) continue;
    if (isTest(entry.name)) continue;
    if (SOURCE_EXTENSIONS.some((extension) => entry.name.endsWith(extension))) {
      yield absolutePath;
    }
  }
}

/**
 * Every off-system utility class in scope, sorted for stable diffs. Tests may
 * narrow `roots` while keeping roster and Tailwind resolution bound to `root`.
 */
export async function findViolations(root = repoRoot, roots = scanRoots(root)) {
  const rosters = await readRosters(root);
  const designSystem = await loadDesignSystem(root);
  const { fixed, apps } = roots;

  const sites = [];
  const candidates = new Set();
  const sourceRoots = [
    ...fixed.map((dir) => ({ dir, includeVendor: false })),
    ...apps.map((dir) => ({ dir, includeVendor: true })),
  ];
  for (const { dir, includeVendor } of sourceRoots) {
    for (const absolutePath of walk(dir, { includeVendor })) {
      const file = relative(root, absolutePath).split(sep).join("/");
      for (const { line, text } of stringLiterals(readFileSync(absolutePath, "utf8"))) {
        // Split on markup delimiters too. A class list embedded in an HTML
        // string would otherwise arrive as `class="text-sm` and `bg-white">`,
        // neither of which compiles.
        for (const value of text.split(/[\s"'`<>]+/).filter(Boolean)) {
          sites.push({ file, line, value });
          candidates.add(value);
        }
      }
    }
  }

  // Compiled once per distinct candidate. The same class recurs across hundreds
  // of call sites, and the compile is the expensive half.
  const ordered = [...candidates];
  const compiled = designSystem.candidatesToCss(ordered);
  const reasons = new Map();
  ordered.forEach((candidate, index) => {
    const css = compiled[index];
    const reason = classifyCandidate(candidate, css, rosters);
    // A literal that compiles to nothing and is not intentionally denied is
    // not a class at all.
    if (reason) reasons.set(candidate, reason);
  });

  const violations = [];
  for (const site of sites) {
    const reason = reasons.get(site.value);
    if (reason) violations.push({ ...site, reason });
  }

  return violations.sort(
    (a, b) => a.file.localeCompare(b.file) || a.value.localeCompare(b.value) || a.line - b.line,
  );
}

/** Keyed by file and class, never line: a line number churns on every edit above it. */
export const baselineKey = ({ file, value }) => `${file} :: ${value}`;

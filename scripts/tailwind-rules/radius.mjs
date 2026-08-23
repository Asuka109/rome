/**
 * Policy for border radius declarations produced by Tailwind. This module is
 * also the single home of the radius contract: the roster regexes here are
 * imported by `check-utility-tokens.mjs` (the source-scan gate) and
 * `check-radius-values.mjs` (the raw-declaration gate), so the three checks
 * cannot drift apart. Scale rationale:
 * `docs/ui/primitive-token/border-radius-primitives.md`.
 */

import valueParser from "postcss-value-parser";

export const RADIUS_PROPERTIES = new Set([
  "border-radius",
  "border-top-left-radius",
  "border-top-right-radius",
  "border-bottom-right-radius",
  "border-bottom-left-radius",
  "border-start-start-radius",
  "border-start-end-radius",
  "border-end-start-radius",
  "border-end-end-radius",
]);

/**
 * The names the radius canon owns: a `--rome-radius-*` step or saturation, or
 * a `--control-r-*` alias. Enumerated because the scale is closed — "the steps
 * are 4, 8, 12, and 16 — no other number exists" — so a typoed or invented
 * name must not ride the namespace through.
 */
const RADIUS_ROSTER = "--rome-radius-(?:4|8|12|16|full)|--control-r-(?:sm|md|lg)";

export const RADIUS_TOKEN_NAME = new RegExp(`^(?:${RADIUS_ROSTER})$`, "i");

/**
 * A clean read of a roster name, for the string-based gates. Exact `var()`
 * only: arithmetic over a step derives a corner, and derivation happens once,
 * in the scale.
 */
export const RADIUS_TOKEN_READ = new RegExp(`^var\\(\\s*(?:${RADIUS_ROSTER})\\s*\\)$`, "i");

/**
 * A corner value the scale has no opinion on. Zero strips seams and is not a
 * scale value, so `rounded-none` and its directional variants pass.
 */
export const RADIUS_KEYWORD = /^(?:-?0(?:px)?|inherit|initial|unset|revert(?:-layer)?)$/i;

/**
 * The shadcn `--radius` contract the legacy ladder (`rounded-sm/md/lg/xl/2xl`)
 * resolves through, kept for third-party app compatibility, not for Rome's own
 * corners.
 */
export const LEGACY_RADIUS_NAMESPACE = /^--radius(?:-|$)/;

/** The `rounded` namespace, at the end of a candidate's variant chain. */
const RADIUS_CLASS = /^rounded(?:-|$)/;

function significant(nodes) {
  return nodes.filter((node) => node.type !== "space" && node.type !== "comment");
}

function variableName(node) {
  if (node.type !== "function" || node.value.toLowerCase() !== "var") return null;
  const nodes = significant(node.nodes);
  return nodes[0]?.type === "word" && nodes[0].value.startsWith("--") ? nodes[0].value : null;
}

function collectVariables(nodes, variables = []) {
  for (const node of nodes) {
    const name = variableName(node);
    if (name) variables.push({ name, node });
    if (node.nodes) collectVariables(node.nodes, variables);
  }
  return variables;
}

function hasLiteralFallback(variable) {
  const nodes = significant(variable.node.nodes);
  const comma = nodes.findIndex((node) => node.type === "div" && node.value === ",");
  if (comma < 0) return false;
  return collectVariables(nodes.slice(comma + 1)).length === 0;
}

/**
 * The policy finding for one compiled radius declaration, or null. The
 * shorthand takes up to four corners and an elliptical `/` split, so each
 * component judges alone: every one must be a clean roster read or zero.
 */
export function classifyRadiusDeclaration({ value }) {
  const parsed = valueParser(value);
  const components = parsed.nodes.filter(
    (node) => node.type !== "space" && node.type !== "div" && node.type !== "comment",
  );

  const cleanRead = (node) => {
    const name = variableName(node);
    if (name && RADIUS_TOKEN_NAME.test(name) && significant(node.nodes).length === 1) return true;
    return node.type === "word" && RADIUS_KEYWORD.test(node.value);
  };
  if (components.length > 0 && components.every(cleanRead)) return null;

  const variables = collectVariables(parsed.nodes).filter(({ name }) => !name.startsWith("--tw-"));
  if (variables.some(hasLiteralFallback)) return "arbitrary radius";
  if (variables.some(({ name }) => LEGACY_RADIUS_NAMESPACE.test(name))) {
    return "legacy radius ladder";
  }
  if (variables.length > 0) return "off-roster radius token";
  return "arbitrary radius";
}

function radiusCandidates(selector) {
  return [...selector.matchAll(/\.((?:\\.|[^\s.#:[\]>+~,()])+)/g)]
    .map((match) => match[1].replace(/\\(.)/g, "$1"))
    .filter((candidate) => RADIUS_CLASS.test(candidate.split(":").at(-1)));
}

function utilityContext(declaration) {
  for (let node = declaration.parent; node; node = node.parent) {
    if (node.type !== "rule") continue;
    const candidates = radiusCandidates(node.selector);
    if (candidates.length > 0) return { candidates, selector: node.selector };
  }

  // Tailwind points declarations expanded from `@apply` back at the applied
  // candidate in the original PostCSS input. That stable source range lets the
  // compiled-value rule retain the utility name even under a custom selector.
  const source = declaration.source;
  if (source?.start?.offset !== undefined && source.end?.offset !== undefined) {
    const authored = source.input.css
      .slice(source.start.offset, source.end.offset + 1)
      .trim()
      .replace(/[;}]+$/, "");
    if (RADIUS_CLASS.test(authored.split(":").at(-1))) {
      return { candidates: [authored], selector: declaration.parent.selector };
    }
  }
  return null;
}

/** Require every emitted radius utility to read the sanctioned roster. */
export const radiusUtilityRule = {
  name: "radius-utility-values",
  check({ root, report }) {
    const seen = new Set();
    root.walkDecls((declaration) => {
      const property = declaration.prop.toLowerCase();
      if (!RADIUS_PROPERTIES.has(property)) return;

      const utility = utilityContext(declaration);
      if (!utility) return;
      const value = declaration.value.trim();
      for (const candidate of utility.candidates) {
        const reason = classifyRadiusDeclaration({ candidate, property, value });
        if (!reason) continue;

        const key = `${candidate}\0${reason}`;
        if (seen.has(key)) continue;
        seen.add(key);
        report({
          candidate,
          selector: utility.selector,
          property,
          value,
          reason,
        });
      }
    });
  },
};

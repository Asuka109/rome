#!/usr/bin/env node
/**
 * analyze-palette.mjs — mechanical checks for a design-system color palette.
 * Dependency-free Node ESM; all color math is implemented inline.
 *
 * Usage:
 *   node analyze-palette.mjs <palette.json> [ramps|contrast|cvd|all] [--json]
 *
 * Input schema (all sections optional — run whichever checks you have data for):
 * {
 *   "ramps": {                       // primitive scales, step name -> color
 *     "sand": { "50": "#faf7f2", "100": "oklch(95% 0.01 80)", ... },
 *     "blue": { ... }
 *   },
 *   "pairs": [                       // declared fg/bg pairings to verify
 *     { "name": "primary/on-primary", "fg": "#fff", "bg": "#c1442e",
 *       "use": "text" }              // use: "text" | "large-text" | "ui"
 *   ],
 *   "groups": [                      // sets whose members must stay
 *     { "name": "status", "colors":  // distinguishable from each other
 *       { "success": "#1a7f37", "danger": "#cf222e", "warning": "#9a6700" } }
 *   ]
 * }
 *
 * Accepted color syntaxes: #rgb, #rrggbb, rgb(r g b | r,g,b),
 * oklch(L C H) with L as % or 0..1 fraction.
 *
 * What each check reports (numbers always; verdict flags are advisory —
 * the rules in ../references/rules.md decide what becomes a finding):
 *
 *   ramps    — OKLCH lightness (L) per step per ramp; adjacent-step spacing
 *              irregularity within a ramp; cross-ramp L spread at each step
 *              (interchangeability: same step ≈ same perceived lightness).
 *   contrast — WCAG 2.x ratio and APCA (0.0.98G-4g) Lc for each declared
 *              pair, judged against the pair's stated use.
 *   cvd      — pairwise OKLab ΔE within each group under normal vision and
 *              simulated protanopia / deuteranopia / tritanopia (Machado 2009,
 *              severity 1.0). A pair that is distinguishable normally but not
 *              under simulation "collapses" for that vision type.
 */

import { readFileSync } from "node:fs";

// ── Color parsing ───────────────────────────────────────────────────────────

function parseColor(str) {
  const s = String(str).trim().toLowerCase();
  let m;
  if ((m = s.match(/^#([0-9a-f]{3})$/))) {
    const [r, g, b] = m[1].split("").map((c) => parseInt(c + c, 16) / 255);
    return [r, g, b];
  }
  if ((m = s.match(/^#([0-9a-f]{6})$/))) {
    return [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16) / 255);
  }
  if ((m = s.match(/^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/))) {
    return [m[1], m[2], m[3]].map((v) => Number(v) / 255);
  }
  if ((m = s.match(/^oklch\(\s*([\d.]+%?)\s+([\d.]+)\s+([\d.]+)/))) {
    const L = m[1].endsWith("%") ? Number(m[1].slice(0, -1)) / 100 : Number(m[1]);
    const C = Number(m[2]);
    const H = (Number(m[3]) * Math.PI) / 180;
    return oklabToSrgb([L, C * Math.cos(H), C * Math.sin(H)]);
  }
  throw new Error(`Unparseable color: "${str}"`);
}

// ── sRGB <-> linear <-> OKLab ───────────────────────────────────────────────

const srgbToLinear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const linearToSrgb = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

function srgbToOklab([r, g, b]) {
  const [lr, lg, lb] = [r, g, b].map(srgbToLinear);
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

function oklabToSrgb([L, a, b]) {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const lin = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
  // Clamp: out-of-gamut oklch inputs land at the nearest channel extreme,
  // matching how browsers rasterize them closely enough for auditing.
  return lin.map((c) => Math.min(1, Math.max(0, linearToSrgb(c))));
}

const deltaEok = (c1, c2) => Math.hypot(...srgbToOklab(c1).map((v, i) => v - srgbToOklab(c2)[i]));

// ── WCAG 2.x contrast ───────────────────────────────────────────────────────

function wcagLuminance([r, g, b]) {
  const [lr, lg, lb] = [r, g, b].map(srgbToLinear);
  return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
}

function wcagRatio(fg, bg) {
  const [l1, l2] = [wcagLuminance(fg), wcagLuminance(bg)].sort((a, b) => b - a);
  return (l1 + 0.05) / (l2 + 0.05);
}

// ── APCA (SAPC-APCA 0.0.98G-4g constants) ───────────────────────────────────

function apcaY([r, g, b]) {
  let y = 0.2126729 * r ** 2.4 + 0.7151522 * g ** 2.4 + 0.072175 * b ** 2.4;
  if (y < 0.022) y += (0.022 - y) ** 1.414; // soft black clamp
  return y;
}

function apcaLc(fg, bg) {
  const ytx = apcaY(fg);
  const ybg = apcaY(bg);
  let sapc;
  if (ybg > ytx) {
    sapc = (ybg ** 0.56 - ytx ** 0.57) * 1.14; // dark text on light bg
    return sapc < 0.1 ? 0 : (sapc - 0.027) * 100;
  }
  sapc = (ybg ** 0.65 - ytx ** 0.62) * 1.14; // light text on dark bg
  return sapc > -0.1 ? 0 : (sapc + 0.027) * 100;
}

// ── CVD simulation (Machado, Oliveira & Fernandes 2009; severity 1.0) ───────

const CVD_MATRICES = {
  protanopia: [
    [0.152286, 1.052583, -0.204868],
    [0.114503, 0.786281, 0.099216],
    [-0.003882, -0.048116, 1.051998],
  ],
  deuteranopia: [
    [0.367322, 0.860646, -0.227968],
    [0.280085, 0.672501, 0.047413],
    [-0.01182, 0.04294, 0.968881],
  ],
  tritanopia: [
    [1.255528, -0.076749, -0.178779],
    [-0.078411, 0.930809, 0.147602],
    [0.004733, 0.691367, 0.3039],
  ],
};

function simulateCvd(rgb, type) {
  const lin = rgb.map(srgbToLinear);
  const M = CVD_MATRICES[type];
  return M.map((row) =>
    Math.min(1, Math.max(0, linearToSrgb(row[0] * lin[0] + row[1] * lin[1] + row[2] * lin[2]))),
  );
}

// ── Checks ──────────────────────────────────────────────────────────────────

const r3 = (n) => Math.round(n * 1000) / 1000;
const r2 = (n) => Math.round(n * 100) / 100;

function checkRamps(ramps) {
  const perRamp = {};
  for (const [name, steps] of Object.entries(ramps)) {
    const entries = Object.entries(steps).map(([step, color]) => ({
      step,
      L: r3(srgbToOklab(parseColor(color))[0]),
    }));
    const deltas = entries.slice(1).map((e, i) => r3(e.L - entries[i].L));
    const meanDelta = deltas.length ? deltas.reduce((a, b) => a + b, 0) / deltas.length : 0;
    const maxIrregularity = deltas.length
      ? r3(Math.max(...deltas.map((d) => Math.abs(d - meanDelta))))
      : 0;
    const monotonic = deltas.every((d) => d <= 0) || deltas.every((d) => d >= 0);
    perRamp[name] = { steps: entries, deltas, maxIrregularity, monotonic };
  }
  // Interchangeability: L spread at each step name shared by 2+ ramps.
  const byStep = {};
  for (const [name, data] of Object.entries(perRamp)) {
    for (const { step, L } of data.steps) (byStep[step] ??= []).push({ ramp: name, L });
  }
  const crossRamp = Object.entries(byStep)
    .filter(([, v]) => v.length > 1)
    .map(([step, v]) => {
      const Ls = v.map((x) => x.L);
      return { step, spread: r3(Math.max(...Ls) - Math.min(...Ls)), ramps: v };
    })
    .sort((a, b) => b.spread - a.spread);
  return { perRamp, crossRamp };
}

const WCAG_TARGET = { text: 4.5, "large-text": 3, ui: 3 };
const APCA_TARGET = { text: 75, "large-text": 60, ui: 45 };

function checkContrast(pairs) {
  return pairs.map((p) => {
    const fg = parseColor(p.fg);
    const bg = parseColor(p.bg);
    const use = p.use ?? "text";
    const ratio = r2(wcagRatio(fg, bg));
    const lc = r2(apcaLc(fg, bg));
    return {
      name: p.name,
      use,
      wcag: ratio,
      wcagTarget: WCAG_TARGET[use],
      wcagPass: ratio >= WCAG_TARGET[use],
      apcaLc: lc,
      apcaTarget: APCA_TARGET[use],
      apcaPass: Math.abs(lc) >= APCA_TARGET[use],
    };
  });
}

// Below ~0.10 in OKLab, two UI colors read as "the same color at a glance"
// for meaning-carrying purposes (an advisory line, not a standard).
const CVD_CLOSE = 0.1;

function checkCvd(groups) {
  return groups.map((g) => {
    const names = Object.keys(g.colors);
    const rows = [];
    for (let i = 0; i < names.length; i++) {
      for (let j = i + 1; j < names.length; j++) {
        const [a, b] = [parseColor(g.colors[names[i]]), parseColor(g.colors[names[j]])];
        const row = { pair: `${names[i]} vs ${names[j]}`, normal: r3(deltaEok(a, b)) };
        for (const type of Object.keys(CVD_MATRICES)) {
          row[type] = r3(deltaEok(simulateCvd(a, type), simulateCvd(b, type)));
        }
        row.collapses = Object.keys(CVD_MATRICES).filter(
          (t) => row.normal >= CVD_CLOSE && row[t] < CVD_CLOSE,
        );
        rows.push(row);
      }
    }
    return { name: g.name, pairs: rows };
  });
}

// ── Reporting ───────────────────────────────────────────────────────────────

function table(rows, cols) {
  const widths = cols.map((c) => Math.max(c.length, ...rows.map((r) => String(r[c]).length)));
  const line = (r) => cols.map((c, i) => String(r[c]).padEnd(widths[i])).join("  ");
  return [line(Object.fromEntries(cols.map((c) => [c, c]))), ...rows.map(line)].join("\n");
}

function printRamps({ perRamp, crossRamp }) {
  console.log("== Ramp uniformity (OKLCH lightness) ==\n");
  for (const [name, d] of Object.entries(perRamp)) {
    console.log(`${name}: ${d.steps.map((s) => `${s.step}=${s.L}`).join("  ")}`);
    console.log(
      `  adjacent-step ΔL: [${d.deltas.join(", ")}]  max irregularity: ${d.maxIrregularity}` +
        `${d.monotonic ? "" : "  ⚠ NOT MONOTONIC"}` +
        `${d.maxIrregularity > 0.04 ? "  ⚠ uneven spacing" : ""}`,
    );
  }
  if (crossRamp.length) {
    console.log("\nCross-ramp L spread per step (interchangeability; ⚠ if > 0.03):");
    for (const { step, spread, ramps } of crossRamp) {
      console.log(
        `  step ${step}: spread ${spread}${spread > 0.03 ? " ⚠" : ""}  ` +
          ramps.map((r) => `${r.ramp}=${r.L}`).join("  "),
      );
    }
  }
}

function printContrast(results) {
  console.log("== Declared pair contrast ==\n");
  console.log(
    table(
      results.map((r) => ({
        pair: r.name,
        use: r.use,
        WCAG: `${r.wcag}:1`,
        "WCAG target": `${r.wcagTarget}:1 ${r.wcagPass ? "pass" : "FAIL"}`,
        "APCA Lc": r.apcaLc,
        "APCA target": `${r.apcaTarget} ${r.apcaPass ? "pass" : "FAIL"}`,
      })),
      ["pair", "use", "WCAG", "WCAG target", "APCA Lc", "APCA target"],
    ),
  );
}

function printCvd(results) {
  console.log("== CVD distinguishability (OKLab ΔE; pairs read as 'same' below ~0.10) ==\n");
  for (const g of results) {
    console.log(`group: ${g.name}`);
    console.log(
      table(
        g.pairs.map((p) => ({
          pair: p.pair,
          normal: p.normal,
          protan: p.protanopia,
          deutan: p.deuteranopia,
          tritan: p.tritanopia,
          verdict: p.collapses.length ? `⚠ collapses: ${p.collapses.join(", ")}` : "ok",
        })),
        ["pair", "normal", "protan", "deutan", "tritan", "verdict"],
      ),
    );
    console.log();
  }
}

// ── Main ────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2).filter((a) => a !== "--json");
const asJson = process.argv.includes("--json");
const [file, mode = "all"] = args;
if (!file) {
  console.error("usage: analyze-palette.mjs <palette.json> [ramps|contrast|cvd|all] [--json]");
  process.exit(1);
}
const palette = JSON.parse(readFileSync(file, "utf8"));

const out = {};
if ((mode === "all" || mode === "ramps") && palette.ramps) out.ramps = checkRamps(palette.ramps);
if ((mode === "all" || mode === "contrast") && palette.pairs)
  out.contrast = checkContrast(palette.pairs);
if ((mode === "all" || mode === "cvd") && palette.groups) out.cvd = checkCvd(palette.groups);

if (asJson) {
  console.log(JSON.stringify(out, null, 2));
} else {
  if (out.ramps) printRamps(out.ramps);
  if (out.contrast) {
    if (out.ramps) console.log();
    printContrast(out.contrast);
  }
  if (out.cvd) {
    console.log();
    printCvd(out.cvd);
  }
}

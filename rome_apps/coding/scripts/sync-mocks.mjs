#!/usr/bin/env node
// Sync the ui-ux-pro-max visual mocks into the coding app so they ship as
// app-local assets. Copies every `<id>.html` plus its `_prompts/<id>.md`
// (kept for future use) into `src/mocks/`, and generates `src/mocks/index.json`
// with the metadata the Frontend gallery renders.
//
// The mock pages and styling prompts were generated with and inspired by the
// ui-ux-pro-max-skill project — credit and thanks to its authors:
//   https://github.com/nextlevelbuilder/ui-ux-pro-max-skill
//
// Usage:
//   node scripts/sync-mocks.mjs <sourceDir>
//
// `sourceDir` must point at a directory that contains `*.html` mock files and a
// sibling `_prompts/` folder — e.g. `preview/visual-mocks` inside a checkout of
// https://github.com/nextlevelbuilder/ui-ux-pro-max-skill. Set DEFAULT_SOURCE
// below to your local checkout path if you want to run it without an argument.

import { cpSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const appDir = resolve(here, "..");

// Path to a local checkout of the ui-ux-pro-max-skill `preview/visual-mocks`
// directory (https://github.com/nextlevelbuilder/ui-ux-pro-max-skill). Left
// empty so the path stays machine-agnostic — pass it as the first CLI argument.
const DEFAULT_SOURCE = "";
const sourceArg = process.argv[2] ?? DEFAULT_SOURCE;
if (!sourceArg) {
  console.error(
    "Usage: node scripts/sync-mocks.mjs <sourceDir>\n" +
      "Point <sourceDir> at the `preview/visual-mocks` directory of a checkout of\n" +
      "https://github.com/nextlevelbuilder/ui-ux-pro-max-skill",
  );
  process.exit(1);
}
const sourceDir = resolve(sourceArg);
const promptsSrc = join(sourceDir, "_prompts");

const destDir = join(appDir, "src", "mocks");
const promptsDest = join(destDir, "_prompts");

function decodeEntities(value) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&mdash;/g, "—")
    .trim();
}

function extractTitle(html, fallback) {
  const match = html.match(/<title>([\s\S]*?)<\/title>/i);
  return match ? decodeEntities(match[1].replace(/\s+/g, " ")) : fallback;
}

function field(md, label) {
  // Matches a markdown bullet like `- **Type:** Mobile · ...` and returns the
  // value up to the next ` · ` separator or end of line.
  const re = new RegExp(`\\*\\*${label}:\\*\\*\\s*([^\\n]+)`, "i");
  const match = md.match(re);
  if (!match) return undefined;
  return match[1].split("·")[0].replace(/\|.*$/, "").trim();
}

function multilineField(md, label) {
  const re = new RegExp(`\\*\\*${label}:\\*\\*\\s*([^\\n]+)`, "i");
  const match = md.match(re);
  return match ? match[1].trim() : undefined;
}

function extractStyleName(md, fallback) {
  const heading = md.match(/^#\s*Styling Prompt\s*[—-]\s*(.+)$/m);
  if (!heading) return fallback;
  // "Bauhaus (包豪斯)" -> keep the latin part for the label.
  return heading[1].replace(/\s*\(.*\)\s*$/, "").trim() || fallback;
}

function titleCase(slug) {
  return slug
    .split("-")
    .map((part) => (part.length <= 2 ? part.toUpperCase() : part[0].toUpperCase() + part.slice(1)))
    .join(" ");
}

console.log(`Syncing mocks from ${sourceDir}`);

const htmlFiles = readdirSync(sourceDir)
  .filter((name) => name.endsWith(".html"))
  .sort();

if (htmlFiles.length === 0) {
  console.error(`No .html mock files found in ${sourceDir}`);
  process.exit(1);
}

// Reset destination so removed source mocks don't linger.
rmSync(destDir, { recursive: true, force: true });
mkdirSync(promptsDest, { recursive: true });

const entries = [];

for (const file of htmlFiles) {
  const id = file.replace(/\.html$/, "");
  const html = readFileSync(join(sourceDir, file), "utf8");
  cpSync(join(sourceDir, file), join(destDir, file));

  let md;
  const promptPath = join(promptsSrc, `${id}.md`);
  try {
    md = readFileSync(promptPath, "utf8");
    cpSync(promptPath, join(promptsDest, `${id}.md`));
  } catch {
    md = undefined;
  }

  const type = (md && field(md, "Type")) || "General";
  const entry = {
    id,
    name: extractTitle(html, titleCase(id)),
    style: md ? extractStyleName(md, titleCase(id)) : titleCase(id),
    type,
    layout: /mobile/i.test(type) ? "mobile" : "desktop",
    keywords: md ? (multilineField(md, "Look & feel / keywords") ?? "") : "",
    description: md ? (multilineField(md, "Art direction") ?? "") : "",
    hasPrompt: Boolean(md),
  };
  entries.push(entry);
}

// Copy the prompt template alongside the rest for reference.
try {
  cpSync(join(promptsSrc, "_TEMPLATE.md"), join(promptsDest, "_TEMPLATE.md"));
} catch {
  /* template is optional */
}

const index = {
  // Mock pages + styling prompts generated with and inspired by the
  // ui-ux-pro-max-skill project.
  credit: "Generated with and inspired by https://github.com/nextlevelbuilder/ui-ux-pro-max-skill",
  count: entries.length,
  mocks: entries,
};

writeFileSync(join(destDir, "index.json"), `${JSON.stringify(index, null, 2)}\n`);

const mobile = entries.filter((e) => e.layout === "mobile").length;
console.log(
  `Wrote ${entries.length} mocks to ${destDir} (${mobile} mobile, ${entries.length - mobile} desktop) + index.json`,
);

import { defineConfig } from "@rsbuild/core";
import { pluginReact } from "@rsbuild/plugin-react";
import { pluginSvgr } from "@rsbuild/plugin-svgr";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

/**
 * Build config for UX audit reports — a standalone page that presents audit
 * findings with live, interactive reproductions of the UI being critiqued.
 *
 * This lives in the skill, not in the product: a report is audit tooling and
 * its findings are audit output, neither of which belongs in rome-web's source
 * tree. But it still compiles *against* rome-web, because the whole argument of
 * a report is that the reproductions are the real thing. They import the real
 * `@rome-os/ui` primitives, and the page calls the same `injectThemeCss()` the
 * dashboard does — so a report shows the product surface rather than a
 * hand-drawn facsimile, and it tracks the kit as the kit changes.
 *
 * Reaching into the workspace from outside it takes two things:
 *
 *   - `resolve.alias` maps `@` at packages/web/src, as the app does.
 *   - `resolve.modules` (set on the rspack config below) points at
 *     packages/web/node_modules. Resolution normally walks up from the
 *     importing file, and walking up from here finds only the workspace root's
 *     own devDependencies — no react, no kit.
 *
 * Output is deliberately ONE self-contained file. Scripts, styles and fonts are
 * inlined (no hashed asset siblings, no CDN), so `dist-report/index.html` can be
 * attached to a message or opened offline and still render exactly as built.
 * `chunkSplit: all-in-one` is load-bearing: inlining only works when there is a
 * single chunk to inline.
 *
 * Not invoked directly — `build.mjs` owns the staging and the working
 * directory. See its header for why.
 */
const reportDir = fileURLToPath(new URL("./", import.meta.url));
// `build.mjs` stages these sources outside the repo before building, so the
// workspace can't be located relative to this file — it passes the path in.
const webDir =
  process.env.UX_AUDIT_WEB_DIR ??
  resolve(fileURLToPath(new URL("../../../../", import.meta.url)), "packages/web");
const srcDir = resolve(webDir, "src");

export default defineConfig({
  root: reportDir,
  plugins: [pluginReact(), pluginSvgr()],
  resolve: {
    alias: {
      "@": srcDir,
    },
  },
  tools: {
    rspack: (config) => {
      // See the header: nothing resolves from here without this.
      config.resolve ??= {};
      config.resolve.modules = [resolve(webDir, "node_modules"), "node_modules"];
    },
    // `styles.css` reaches the chat markdown surface, which imports KaTeX, and
    // KaTeX ships twenty @font-face rules. Inlining those would base64 roughly
    // a megabyte of maths glyphs into a report that renders no maths — it shows
    // product surfaces, never a chat transcript. (2.2MB -> 738kB.)
    //
    // It has to be done by font-family here, not by dropping the `@import`:
    // Rspack inlines CSS imports in its own parser, so by the time any hook
    // runs — postcss, resolve.alias, or a module-graph plugin — the at-rule is
    // already gone and only the rules it pulled in remain.
    postcss: (_config, { addPlugins }) => {
      // Minimal shape of the PostCSS nodes touched below; the real types aren't
      // resolvable from here and only these three fields are read.
      type Decl = { type: string; prop?: string; value?: string };
      type FontFaceRule = { nodes?: Decl[]; remove: () => void };

      addPlugins({
        postcssPlugin: "report-drop-katex-fonts",
        AtRule: {
          "font-face": (rule: FontFaceRule) => {
            const family = rule.nodes?.find((n) => n.type === "decl" && n.prop === "font-family");
            if (family?.value && /KaTeX_/.test(family.value)) rule.remove();
          },
        },
      });
    },
  },
  source: {
    entry: { index: resolve(reportDir, "main.tsx") },
  },
  html: {
    template: "./index.html",
    // Load-bearing with `inlineScripts`. The default injects into <head> and
    // relies on `defer` to hold execution until the DOM is parsed — but `defer`
    // is only honoured on scripts with a `src`. Inlined, the bundle would run
    // in <head> and find no #root to mount into.
    inject: "body",
  },
  server: {
    port: Number(process.env.REPORT_PORT ?? 3300),
    strictPort: true,
  },
  performance: {
    chunkSplit: { strategy: "all-in-one" },
  },
  output: {
    target: "web",
    distPath: { root: "dist-report" },
    filenameHash: false,
    inlineScripts: true,
    inlineStyles: true,
    // Keeps dependency licences in the file rather than emitting a sibling
    // .LICENSE.txt, so the build really is one shareable artifact.
    legalComments: "inline",
    dataUriLimit: {
      // Every font weight the report uses, base64'd into the stylesheet.
      font: 512 * 1024,
      image: 512 * 1024,
      svg: 512 * 1024,
      media: 0,
    },
  },
});

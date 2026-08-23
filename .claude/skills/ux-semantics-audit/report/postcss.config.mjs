/**
 * Mirrors packages/web/postcss.config.mjs.
 *
 * rsbuild looks for a PostCSS config relative to the build's `root`, which is
 * this directory — not the workspace. Without this file Tailwind never runs and
 * the report builds with no utility classes at all: real components, real
 * tokens, and no layout.
 */
export default {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

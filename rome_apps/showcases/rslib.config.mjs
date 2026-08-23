import { defineConfig } from "@rome-os/app-web-sdk/config";

// The Mermaid renderer (`beautiful-mermaid` → `elkjs/lib/elk.bundled.js`) is a
// browserify bundle that probes for CommonJS with `"function" == typeof require
// && require`. In the web/ESM build the bundler rewrites `typeof require` to
// "function", so the bare `require` reference then throws "require is not
// defined" at module load and crashes the app. Forcing `typeof require` to
// "undefined" makes elk take its in-browser module-table path instead. This is
// safe: our code never uses `require`, and the ESM runtime uses
// `__webpack_require__`, not `require`.
export default defineConfig({
  source: {
    define: {
      "typeof require": JSON.stringify("undefined"),
    },
  },
});

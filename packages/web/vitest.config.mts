import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  test: {
    // Pin NODE_ENV so an inherited `production` from the calling shell can't leak
    // in. Vitest only defaults NODE_ENV to "test" when it is unset, and React's
    // production build omits `act`, which breaks every @testing-library render.
    env: { NODE_ENV: "test" },
    // Default to node; component tests opt into jsdom via a per-file
    // `// @vitest-environment jsdom` docblock so the fast logic suite stays node.
    environment: "node",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
  },
});

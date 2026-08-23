import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Pin NODE_ENV so an inherited `production` from the calling shell can't leak
    // in. Vitest only defaults NODE_ENV to "test" when it is unset, and React's
    // production build omits `act`, which breaks every @testing-library render.
    env: { NODE_ENV: "test" },
    // Unlike `packages/web` (a mixed logic + component suite that defaults to
    // node and opts into jsdom per file), everything published from this package
    // is a React component, so jsdom is the default here.
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
  },
});

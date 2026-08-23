import { defineConfig } from "vitest/config";

// Only the pure shell logic (e.g. the origin allowlist) is unit-tested here —
// it has no React Native imports, so it runs in a plain node env with no
// Metro/jest-expo/babel setup. WebView/device behavior is validated on a real
// device, not in this runner.
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});

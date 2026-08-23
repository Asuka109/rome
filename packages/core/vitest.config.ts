import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  test: {
    globals: true,
    environment: "node",
    include: [
      "src/**/*.test.ts",
      "../app-runtime-sdk/src/**/*.test.ts",
      "../../rome_apps/**/*.test.ts",
      "../../scripts/**/*.test.ts",
      "../../infra/**/*.test.ts",
    ],
    exclude: [
      "**/node_modules/**",
      "../**/node_modules/**",
      "../../**/node_modules/**",
      "**/dist/**",
      "../**/dist/**",
      "../../**/dist/**",
    ],
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts", "../app-runtime-sdk/src/**/*.ts", "../../rome_apps/**/*.ts"],
      exclude: [
        "src/**/*.test.ts",
        "../app-runtime-sdk/src/**/*.test.ts",
        "../../rome_apps/**/*.test.ts",
        "src/**/types.ts",
        "src/telemetry.ts",
        "src/index.ts",
      ],
      thresholds: {
        branches: 65,
        functions: 60,
        lines: 50,
      },
    },
    fileParallelism: true,
    sequence: { concurrent: false },
    testTimeout: 10_000,
    hookTimeout: 10_000,
  },
});

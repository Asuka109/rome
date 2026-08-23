import { defineConfig } from "@playwright/test";

const isCI = !!process.env.CI;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: isCI,
  // No retries, on purpose. These assertions are pure geometry over a
  // fixture-driven page, so a result that changes between runs means the
  // layout itself is non-deterministic — which is the bug, not noise to
  // paper over. A retry here would hide exactly what the suite exists to find.
  retries: 0,
  reporter: isCI ? [["github"], ["list"]] : [["list"]],
  use: {
    baseURL: "http://localhost:3200",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "pnpm dev:mock",
    url: "http://localhost:3200",
    // Locally, attach to a dev server you already have up. In CI there is
    // never a legitimate one, and attaching to a stray process would measure
    // the wrong build.
    reuseExistingServer: !isCI,
    // A cold rsbuild start on a shared runner is much slower than a warm
    // local one.
    timeout: isCI ? 180_000 : 60_000,
  },
});

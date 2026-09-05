import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/browser", timeout: 45000, fullyParallel: false, workers: 1,
  use: { baseURL: "http://127.0.0.1:4173", channel: process.env.CI ? undefined : "chrome", viewport: { width: 1440, height: 900 }, screenshot: "only-on-failure", trace: "retain-on-failure" },
  webServer: { command: "node scripts/serve.mjs", url: "http://127.0.0.1:4173", reuseExistingServer: !process.env.CI },
  reporter: [["list"], ["html", { open: "never" }]],
});

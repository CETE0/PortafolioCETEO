import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./scripts/tests",
  testMatch: "equilibrio*.browser.spec.mjs",
  timeout: 90000,
  workers: 1,
  fullyParallel: false,
  reporter: "list",
  outputDir: "test-results/equilibrio",
  use: {
    baseURL: process.env.EXPECT_BASE_URL || "http://localhost:3027",
    viewport: { width: 1280, height: 900 },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    launchOptions: {
      args: [
        "--enable-webgl",
        "--use-gl=angle",
        "--use-angle=swiftshader",
        "--enable-unsafe-swiftshader",
      ],
    },
  },
});

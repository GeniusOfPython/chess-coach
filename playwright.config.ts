import { defineConfig, devices } from "@playwright/test";

const customChromiumPath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
const useProductionBuild = process.env.E2E_USE_PREVIEW === "1";
const chromiumLaunchOptions = customChromiumPath
  ? {
      executablePath: customChromiumPath,
      args: ["--no-sandbox", "--single-process"],
    }
  : undefined;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI
    ? [["list"], ["html", { open: "never" }]]
    : "list",
  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      testIgnore: /visual\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        launchOptions: chromiumLaunchOptions,
      },
    },
    {
      name: "webkit",
      testMatch: /(learning-cycle|keyboard-navigation)\.spec\.ts/,
      use: { ...devices["Desktop Safari"] },
    },
    {
      name: "visual-desktop",
      testMatch: /visual\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 1000 },
        deviceScaleFactor: 1,
        launchOptions: chromiumLaunchOptions,
      },
    },
    {
      name: "visual-mobile",
      testMatch: /visual\.spec\.ts/,
      use: {
        ...devices["Pixel 7"],
        viewport: { width: 412, height: 915 },
        deviceScaleFactor: 1,
        launchOptions: chromiumLaunchOptions,
      },
    },
  ],
  webServer: {
    command: useProductionBuild
      ? "npm run preview -- --host 127.0.0.1 --port 4173"
      : "npm run dev -- --host 127.0.0.1 --port 4173",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});

import { expect, test } from "@playwright/test";
import {
  installDeterministicAppState,
  waitForStableInterface,
} from "./testHarness";

test.skip(
  process.platform !== "linux",
  "Эталонные снимки проверяются в единой Linux-среде CI",
);

test.beforeEach(async ({ page }) => {
  await installDeterministicAppState(page, { activeWorkspace: "coach" });
});

test("основной экран сохраняет утверждённую компоновку", async ({ page }) => {
  await page.goto("/", { waitUntil: "networkidle" });
  await expect(
    page.getByRole("heading", { name: "Шахматный помощник" }),
  ).toBeVisible();
  await waitForStableInterface(page);

  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);

  await expect(page.locator("main.app")).toHaveScreenshot("main-screen.png", {
    animations: "disabled",
    caret: "hide",
    maxDiffPixelRatio: 0.001,
    scale: "css",
  });
});

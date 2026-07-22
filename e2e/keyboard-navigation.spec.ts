import { expect, test } from "@playwright/test";
import { installDeterministicAppState } from "./testHarness";

test.beforeEach(async ({ page }) => {
  await installDeterministicAppState(page, "tools");
});

test("основной сценарий доступен без мыши и не запирает фокус", async ({ page }) => {
  await page.goto("/");

  const skipLink = page.getByRole("link", {
    name: "Перейти к рабочей области",
  });
  await page.keyboard.press("Tab");
  await expect(skipLink).toBeFocused();

  await page.keyboard.press("Enter");
  await expect(page.locator("#workspace-content")).toBeFocused();

  const toolsTab = page.getByRole("tab", { name: /Ещё/ });
  const coachTab = page.getByRole("tab", { name: /Учёба/ });
  const gameTab = page.getByRole("tab", { name: /Партия/ });

  await toolsTab.focus();
  await page.keyboard.press("Home");
  await expect(coachTab).toBeFocused();
  await expect(coachTab).toHaveAttribute("aria-selected", "true");

  await page.keyboard.press("ArrowRight");
  await expect(gameTab).toBeFocused();
  await expect(gameTab).toHaveAttribute("aria-selected", "true");

  await page.keyboard.press("End");
  await expect(toolsTab).toBeFocused();
  await expect(toolsTab).toHaveAttribute("aria-selected", "true");

  const positionTools = page.locator("summary").filter({
    hasText: "PGN и FEN",
  });
  await positionTools.focus();
  await page.keyboard.press("Enter");
  await expect(positionTools.locator("..")).toHaveAttribute("open", "");

  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("button", { name: "Скопировать PGN" }),
  ).toBeFocused();

  await page.keyboard.press("Shift+Tab");
  await expect(positionTools).toBeFocused();
});

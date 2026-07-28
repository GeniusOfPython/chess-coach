import { expect, test } from "@playwright/test";
import { installDeterministicAppState, openApplication } from "./testHarness";

test.beforeEach(async ({ page }) => {
  await installDeterministicAppState(page, { activeWorkspace: "tools" });
});

test("основной сценарий доступен без мыши и не запирает фокус", async ({
  page,
  browserName,
}) => {
  await openApplication(page);

  const skipLink = page.getByRole("link", {
    name: "Перейти к рабочей области",
  });

  if (browserName === "webkit") {
    // WebKit inherits the operating system's full-keyboard-access setting.
    // Playwright cannot control it, so Tab traversal is verified by the
    // Chromium project while WebKit verifies focusability and key handling.
    await skipLink.focus();
  } else {
    await page.keyboard.press("Tab");
  }
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

  const copyPgnButton = page.getByRole("button", {
    name: "Скопировать PGN",
  });
  if (browserName === "webkit") {
    await copyPgnButton.focus();
  } else {
    await page.keyboard.press("Tab");
  }
  await expect(copyPgnButton).toBeFocused();

  if (browserName === "webkit") {
    await positionTools.focus();
  } else {
    await page.keyboard.press("Shift+Tab");
  }
  await expect(positionTools).toBeFocused();
});

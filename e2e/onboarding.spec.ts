import { expect, test } from "@playwright/test";
import { installDeterministicAppState, openApplication } from "./testHarness";

test.beforeEach(async ({ page }) => {
  await installDeterministicAppState(page, {
    activeWorkspace: "coach",
    onboarding: "pending",
  });
});

test("первый запуск переводит выбранную цель в диагностическую партию", async ({ page }) => {
  await openApplication(page);

  const dialog = page.getByRole("dialog", { name: "Настроим тренера под тебя" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: /Меньше грубых ошибок/ }).click();
  await dialog.getByRole("button", { name: /Знаю основы/ }).click();
  await dialog.getByRole("button", { name: "Начать диагностическую партию" }).click();

  await expect(dialog).toBeHidden();
  await expect(page.getByLabel("Диагностическая партия")).toContainText(
    "Играй как обычно",
  );
  await expect(page.getByTestId("active-game-indicator")).toBeVisible();
  await expect.poll(() => page.evaluate(() =>
    window.localStorage.getItem("chess-coach.bot-level-id"),
  )).toBe("casual");

  await page.reload();
  await expect(page.getByRole("dialog", { name: "Настроим тренера под тебя" }))
    .toHaveCount(0);
  await expect(page.getByLabel("Диагностическая партия")).toBeVisible();
});

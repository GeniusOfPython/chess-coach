import { expect, test } from "@playwright/test";
import {
  installDeterministicAppState,
  openApplication,
  openCollapsibleSection,
  openWorkspace,
} from "./testHarness";

const PGN = "1. e4 e5";

test.beforeEach(async ({ page }) => {
  await installDeterministicAppState(page, { activeWorkspace: "coach" });
});

test("партия проходит путь от импорта до исправления ошибки", async ({ page }) => {
  await openApplication(page);
  await openWorkspace(page, "Ещё");
  await openCollapsibleSection(page, "PGN и FEN");
  await page.getByLabel("PGN для импорта").fill(PGN);
  await page.getByRole("button", { name: "Импортировать PGN" }).click();
  await expect(page.getByText(/PGN импортирован/)).toBeVisible();

  await openWorkspace(page, "Партия");
  await page.getByRole("button", { name: "Разобрать" }).click();
  await expect(page.getByText("Ключевые переломные моменты")).toBeVisible();

  await page.getByRole("button", { name: /Тренировать ключевой момент/ }).click();
  await expect(page.getByText("Исправление главной ошибки")).toBeVisible();

  await page.locator('[data-square="d2"]').click();
  await page.locator('[data-square="d4"]').click();
  await expect(page.getByText("Главная ошибка исправлена")).toBeVisible();
  await expect(page.getByLabel("Статистика тренировки")).toContainText("100%");
});

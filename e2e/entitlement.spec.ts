import { expect, test } from "@playwright/test";
import { installDeterministicAppState } from "./testHarness";

test("старый переключатель тарифа не предоставляет Premium", async ({ page }) => {
  await installDeterministicAppState(page, {
    activeWorkspace: "game",
    entitlement: "free",
    storageEntries: {
      "chess-coach.subscription-tier": "premium",
    },
  });

  await page.goto("/");

  await expect(page.getByText("Разбор хода с оценкой", { exact: true }))
    .toBeVisible();
  await expect(page.getByText("Разбор последнего хода", { exact: true }))
    .toHaveCount(0);
});

test("истёкший временный доступ возвращает Free", async ({ page }) => {
  await installDeterministicAppState(page, {
    activeWorkspace: "game",
    entitlement: "expired",
  });

  await page.goto("/");

  await expect(page.getByText("Разбор хода с оценкой", { exact: true }))
    .toBeVisible();
});

test("проверенный Premium открывает расширенный разбор", async ({ page }) => {
  await installDeterministicAppState(page, {
    activeWorkspace: "game",
    entitlement: "premium",
  });

  await page.goto("/");

  await expect(page.getByText("Разбор последнего хода", { exact: true }))
    .toBeVisible();
  await expect(page.getByText("Разбор хода с оценкой", { exact: true }))
    .toHaveCount(0);
});

import { expect, test } from "@playwright/test";
import {
  installDeterministicAppState,
  openApplication,
  setRuntimeEntitlementOverride,
} from "./testHarness";

test("старый переключатель тарифа не предоставляет Premium", async ({ page }) => {
  await installDeterministicAppState(page, {
    activeWorkspace: "game",
    entitlement: "free",
    storageEntries: {
      "chess-coach.subscription-tier": "premium",
      "chess-coach.entitlement": JSON.stringify({
        version: 2,
        kind: "premium",
        source: "web",
        expiresAt: "2099-12-31T23:59:59.000Z",
        verifiedAt: new Date().toISOString(),
        verificationMode: "online",
        autoRenews: true,
      }),
    },
  });

  await openApplication(page);

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

  await openApplication(page);

  await expect(page.getByText("Разбор хода с оценкой", { exact: true }))
    .toBeVisible();
});

test("проверенный Premium открывает расширенный разбор", async ({ page }) => {
  await installDeterministicAppState(page, {
    activeWorkspace: "game",
    entitlement: "premium",
  });

  await openApplication(page);

  await expect(page.getByText("Разбор последнего хода", { exact: true }))
    .toBeVisible();
  await expect(page.getByText("Разбор хода с оценкой", { exact: true }))
    .toHaveCount(0);
});

test("офлайн-проверка сохраняет Premium только в пределах grace period", async ({ page }) => {
  await installDeterministicAppState(page, {
    activeWorkspace: "game",
    entitlement: "offline",
  });

  await openApplication(page);
  await expect(page.getByText("Разбор последнего хода", { exact: true }))
    .toBeVisible();
});

test("просроченный offline grace возвращает Free", async ({ page }) => {
  await installDeterministicAppState(page, {
    activeWorkspace: "game",
    entitlement: "stale",
  });

  await openApplication(page);
  await expect(page.getByText("Разбор хода с оценкой", { exact: true }))
    .toBeVisible();
});

test("платёжный адаптер получает тарифы, покупает Premium и открывает управление", async ({ page }) => {
  await installDeterministicAppState(page, {
    activeWorkspace: "tools",
    entitlement: "free",
    storageEntries: {
      "chess-coach.section.settings": "open",
    },
  });

  await openApplication(page);
  await page.getByRole("button", { name: "Посмотреть Premium" }).click();
  await expect(page.getByRole("button", { name: /Premium на месяц/u }))
    .toBeVisible();
  await page.getByRole("button", { name: /Premium на месяц/u }).click();
  await expect(page.getByText("Premium", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Управлять подпиской" }).click();
  await expect.poll(() => page.evaluate(() =>
    window.sessionStorage.getItem(
      "chess-coach.e2e-subscription-management-opened",
    )
  )).toBe("true");
});

test("событие возврата в приложение повторно проверяет право доступа", async ({ page }) => {
  await installDeterministicAppState(page, {
    activeWorkspace: "game",
    entitlement: "premium",
  });

  await openApplication(page);
  await expect(page.getByText("Разбор последнего хода", { exact: true }))
    .toBeVisible();

  await setRuntimeEntitlementOverride(page, {
    version: 2,
    kind: "free",
    source: "none",
    expiresAt: null,
    verifiedAt: null,
    verificationMode: null,
    autoRenews: false,
  });
  await page.evaluate(() => {
    window.dispatchEvent(new Event("chess-coach:native-resume"));
  });

  await expect(page.getByText("Разбор хода с оценкой", { exact: true }))
    .toBeVisible();
  await expect(page.getByText("Разбор последнего хода", { exact: true }))
    .toHaveCount(0);
});

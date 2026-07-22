import { expect, test } from "@playwright/test";
import { installDeterministicAppState } from "./testHarness";

test("приложение точечно восстанавливается после повреждения localStorage", async ({
  page,
}) => {
  await installDeterministicAppState(page, {
    storageEntries: {
      "chess-coach.game-mode": "corrupted-mode",
      "chess-coach.game-archive": "{broken-json",
      "chess-coach.current-pgn": "1. e4 e5",
      "other-app.session": "must-survive",
    },
  });

  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "Шахматный помощник" }),
  ).toBeVisible();
  await expect(page.getByText("Локальные данные восстановлены")).toBeVisible();
  await expect(page.getByText("Удалено повреждённых записей: 2.")).toBeVisible();

  const storage = await page.evaluate(() => ({
    gameMode: window.localStorage.getItem("chess-coach.game-mode"),
    gameArchive: window.localStorage.getItem("chess-coach.game-archive"),
    currentPgn: window.localStorage.getItem("chess-coach.current-pgn"),
    otherApp: window.localStorage.getItem("other-app.session"),
  }));

  expect(storage.gameMode).toBe("analysis");
  expect(storage.gameArchive).toBeNull();
  expect(storage.currentPgn).toContain("1. e4 e5");
  expect(storage.otherApp).toBe("must-survive");
});

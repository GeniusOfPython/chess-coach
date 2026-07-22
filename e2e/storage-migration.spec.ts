import { expect, test } from "@playwright/test";

test("переносит localStorage в IndexedDB и восстанавливает данные из новой базы", async ({
  page,
}) => {
  await page.addInitScript(() => {
    if (window.sessionStorage.getItem("storage-migration-seeded")) {
      return;
    }

    window.sessionStorage.setItem("storage-migration-seeded", "true");
    window.localStorage.setItem("chess-coach.active-workspace", "coach");
    window.localStorage.setItem("chess-coach.game-mode", "bot");
    window.localStorage.setItem("chess-coach.current-pgn", "1. e4 e5 2. Nf3");
    window.localStorage.setItem("other-app.session", "must-survive");
  });

  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Шахматный помощник" }),
  ).toBeVisible();

  const migrated = await page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = window.indexedDB.open("chess-coach", 1);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const transaction = database.transaction(
      ["app-data", "metadata"],
      "readonly",
    );
    const dataRequest = transaction.objectStore("app-data").get(
      "chess-coach.current-pgn",
    );
    const markerRequest = transaction.objectStore("metadata").get(
      "legacy-local-storage-imported",
    );

    const result = await new Promise<{
      pgn: string | null;
      migrationComplete: boolean;
    }>((resolve, reject) => {
      transaction.oncomplete = () => resolve({
        pgn: dataRequest.result?.value ?? null,
        migrationComplete: markerRequest.result?.value === true,
      });
      transaction.onerror = () => reject(transaction.error);
    });

    database.close();
    return result;
  });

  expect(migrated).toEqual({
    pgn: "1. e4 e5 2. Nf3",
    migrationComplete: true,
  });

  await page.evaluate(() => {
    for (let index = window.localStorage.length - 1; index >= 0; index -= 1) {
      const key = window.localStorage.key(index);

      if (key?.startsWith("chess-coach.")) {
        window.localStorage.removeItem(key);
      }
    }
  });
  await page.reload();

  await expect(
    page.getByRole("heading", { name: "Шахматный помощник" }),
  ).toBeVisible();

  const restored = await page.evaluate(() => ({
    pgn: window.localStorage.getItem("chess-coach.current-pgn"),
    otherApp: window.localStorage.getItem("other-app.session"),
  }));

  expect(restored.pgn).toBe("1. e4 e5 2. Nf3");
  expect(restored.otherApp).toBe("must-survive");
});

test("продолжает работать на localStorage при недоступной IndexedDB", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "indexedDB", {
      configurable: true,
      value: undefined,
    });
    window.localStorage.setItem("chess-coach.active-workspace", "coach");
    window.localStorage.setItem("chess-coach.current-pgn", "1. d4 d5");
  });

  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "Шахматный помощник" }),
  ).toBeVisible();
  expect(
    await page.evaluate(() =>
      window.localStorage.getItem("chess-coach.current-pgn"),
    ),
  ).toBe("1. d4 d5");
});

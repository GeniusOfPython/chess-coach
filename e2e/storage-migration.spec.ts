import { expect, test } from "@playwright/test";
import { Chess } from "chess.js";
import { installDeterministicAppState } from "./testHarness";

function expectPgnMoves(pgn: string | null, expectedMoves: string[]) {
  expect(pgn).not.toBeNull();

  const game = new Chess();
  game.loadPgn(pgn ?? "");

  expect(game.history()).toEqual(expectedMoves);
}

test("переносит localStorage в IndexedDB и восстанавливает данные из новой базы", async ({
  page,
}) => {
  await installDeterministicAppState(page, {
    storageEntries: {
      "chess-coach.game-mode": "bot",
      "chess-coach.current-pgn": "1. e4 e5 2. Nf3",
      "other-app.session": "must-survive",
    },
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

  expect(migrated.migrationComplete).toBe(true);
  expectPgnMoves(migrated.pgn, ["e4", "e5", "Nf3"]);

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

  expectPgnMoves(restored.pgn, ["e4", "e5", "Nf3"]);
  expect(restored.otherApp).toBe("must-survive");
});

test("продолжает работать на localStorage при недоступной IndexedDB", async ({
  page,
}) => {
  await installDeterministicAppState(page, {
    indexedDb: "unavailable",
    storageEntries: {
      "chess-coach.current-pgn": "1. d4 d5",
    },
  });

  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "Шахматный помощник" }),
  ).toBeVisible();
  const fallbackPgn = await page.evaluate(() =>
    window.localStorage.getItem("chess-coach.current-pgn"),
  );

  expectPgnMoves(fallbackPgn, ["d4", "d5"]);
});

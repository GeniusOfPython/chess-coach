import { expect, test } from "@playwright/test";
import { installDeterministicAppState, openApplication } from "./testHarness";

const now = "2026-07-22T12:00:00.000Z";

test.beforeEach(async ({ page }) => {
  await installDeterministicAppState(page, {
    storageEntries: {
      "chess-coach.training-review-queue": JSON.stringify([
        {
          id: "repetition-position",
          positionFen: "7k/8/8/8/8/8/6Q1/6K1 w - - 0 1",
          bestMove: "g2g7",
          moveNumber: 1,
          side: "w",
          playedMove: "g2g3",
          verdict: "blunder",
          evaluationBeforeWhite: 8,
          evaluationAfterWhite: 0,
          evaluationLoss: 8,
          theme: "checks",
          attempts: 0,
          successes: 0,
          lapses: 0,
          intervalDays: 0,
          dueAt: now,
          lastReviewedAt: null,
          createdAt: now,
          updatedAt: now,
        },
      ]),
    },
  });
});

test("restores due mistakes and starts a repetition session", async ({ page }) => {
  await openApplication(page);

  await expect(page.getByText("1 к повторению")).toBeVisible();
  await expect(page.getByText("Слабая тема: Форсирующие шахи")).toBeVisible();
  await page.getByRole("button", { name: "Повторить ошибки" }).click();
  await expect(page.getByText("Повторение на 1-м ходу", { exact: false })).toBeVisible();
});

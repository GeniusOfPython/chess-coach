import { describe, expect, it } from "vitest";
import type { GameReviewItem } from "./gameReview";
import {
  addReviewItemsToRepetitionQueue,
  getDueRepetitionItems,
  getSpacedRepetitionSummary,
  recordRepetitionResult,
} from "./spacedRepetition";

const reviewItem: GameReviewItem = {
  id: "weak-position",
  positionFen: "7k/8/8/8/8/8/6Q1/6K1 w - - 0 1",
  positionIndex: 0,
  moveNumber: 1,
  side: "w",
  playedMove: "g2g3",
  bestMove: "g2g7",
  verdict: "blunder",
  evaluationBeforeWhite: 8,
  evaluationAfterWhite: 0,
  evaluationLoss: 8,
  isPlayerDecision: true,
};

describe("spaced repetition", () => {
  it("adds a trainable mistake once and makes it due immediately", () => {
    const now = "2026-07-22T12:00:00.000Z";
    const first = addReviewItemsToRepetitionQueue([], [reviewItem], now);
    const second = addReviewItemsToRepetitionQueue(first, [reviewItem], now);

    expect(second).toHaveLength(1);
    expect(getDueRepetitionItems(second, now)).toHaveLength(1);
  });

  it("uses growing intervals only for an independent solution", () => {
    const added = addReviewItemsToRepetitionQueue(
      [],
      [reviewItem],
      "2026-07-22T12:00:00.000Z",
    );
    const dayOne = recordRepetitionResult(
      added,
      reviewItem.id,
      true,
      0,
      "2026-07-22T12:00:00.000Z",
    );
    const dayThree = recordRepetitionResult(
      dayOne,
      reviewItem.id,
      true,
      0,
      "2026-07-23T12:00:00.000Z",
    );

    expect(dayOne[0]).toMatchObject({ intervalDays: 1, successes: 1, lapses: 0 });
    expect(dayThree[0]).toMatchObject({ intervalDays: 3, successes: 2, lapses: 0 });
    expect(dayThree[0]!.dueAt).toBe("2026-07-26T12:00:00.000Z");
    expect(dayThree[0]!.reviewHistory).toEqual([
      { reviewedAt: "2026-07-22T12:00:00.000Z", independent: true },
      { reviewedAt: "2026-07-23T12:00:00.000Z", independent: true },
    ]);
  });

  it("returns a hinted solution to the one-day interval and marks the weak theme", () => {
    const added = addReviewItemsToRepetitionQueue(
      [],
      [reviewItem],
      "2026-07-22T12:00:00.000Z",
    );
    const reviewed = recordRepetitionResult(
      added,
      reviewItem.id,
      true,
      1,
      "2026-07-22T12:00:00.000Z",
    );

    expect(reviewed[0]).toMatchObject({ intervalDays: 1, successes: 0, lapses: 1 });
    expect(reviewed[0]!.reviewHistory[0]?.independent).toBe(false);
    expect(getSpacedRepetitionSummary(reviewed).weakThemeLabel).toBeTruthy();
  });

  it("repairs an unsupported stored interval instead of producing an invalid due date", () => {
    const added = addReviewItemsToRepetitionQueue(
      [],
      [reviewItem],
      "2026-07-22T12:00:00.000Z",
    );
    const corrupted = added.map((item) => ({ ...item, intervalDays: 2 }));
    const reviewed = recordRepetitionResult(
      corrupted,
      reviewItem.id,
      true,
      0,
      "2026-07-22T12:00:00.000Z",
    );

    expect(reviewed[0]).toMatchObject({
      intervalDays: 1,
      dueAt: "2026-07-23T12:00:00.000Z",
    });
  });
});

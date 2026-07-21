import { describe, expect, it } from "vitest";
import type { GameReviewItem } from "./gameReview";
import { rankTurningPoints } from "./reviewTimeline";

function item(overrides: Partial<GameReviewItem>): GameReviewItem {
  return {
    id: "review-item",
    positionFen: "fen",
    positionIndex: 0,
    moveNumber: 1,
    side: "w",
    playedMove: "e2e4",
    bestMove: "d2d4",
    verdict: "mistake",
    evaluationBeforeWhite: 0.4,
    evaluationAfterWhite: -0.8,
    evaluationLoss: 1.2,
    isPlayerDecision: true,
    ...overrides,
  };
}

describe("review timeline", () => {
  it("ranks no more than three player decisions", () => {
    const result = rankTurningPoints([
      item({ id: "opponent", evaluationLoss: 5, isPlayerDecision: false }),
      item({ id: "small", evaluationLoss: 0.7, positionIndex: 2 }),
      item({ id: "large", evaluationLoss: 2.4, positionIndex: 4 }),
      item({ id: "medium", evaluationLoss: 1.4, positionIndex: 6 }),
      item({ id: "fourth", evaluationLoss: 0.8, positionIndex: 8 }),
    ]);

    expect(result.map(({ item: reviewItem }) => reviewItem.id)).toEqual([
      "large",
      "medium",
      "fourth",
    ]);
  });

  it("raises a lasting advantage swing above an equal loss", () => {
    const result = rankTurningPoints([
      item({
        id: "stable",
        positionIndex: 2,
        evaluationBeforeWhite: 0.2,
        evaluationAfterWhite: -0.8,
        evaluationLoss: 1,
      }),
      item({
        id: "swing",
        positionIndex: 4,
        evaluationBeforeWhite: 1.2,
        evaluationAfterWhite: -1.2,
        evaluationLoss: 1,
      }),
    ]);

    expect(result[0].item.id).toBe("swing");
    expect(result[0].reason).toBe("Перевес перешёл к сопернику");
  });

  it("ignores moves without a trainable alternative", () => {
    expect(rankTurningPoints([
      item({ bestMove: null, verdict: "blunder" }),
      item({ bestMove: "e2e4", verdict: "good" }),
    ])).toEqual([]);
  });
});

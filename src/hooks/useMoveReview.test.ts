import { describe, expect, it } from "vitest";
import { createInitialMoveReview } from "./useMoveReview";

const baseOptions = {
  playedMove: "e2e4",
  positionBeforeMove: "test-fen",
  evaluationBeforeWhite: 0.25,
};

describe("createInitialMoveReview", () => {
  it("запускает автоматическую оценку без предварительной подсказки", () => {
    const review = createInitialMoveReview({
      ...baseOptions,
      suggestedBestMove: null,
    });

    expect(review).toMatchObject({
      bestMove: null,
      matchedBestMove: null,
      isEvaluating: true,
      verdict: "unknown",
    });
  });

  it("сразу подтверждает совпадение с лучшим ходом", () => {
    const review = createInitialMoveReview({
      ...baseOptions,
      suggestedBestMove: "e2e4",
    });

    expect(review).toMatchObject({
      matchedBestMove: true,
      isEvaluating: false,
      evaluationLoss: 0,
      verdict: "best",
    });
  });

  it("оставляет альтернативный ход на дополнительной оценке", () => {
    const review = createInitialMoveReview({
      ...baseOptions,
      suggestedBestMove: "d2d4",
    });

    expect(review).toMatchObject({
      matchedBestMove: false,
      isEvaluating: true,
      evaluationLoss: null,
      verdict: "unknown",
    });
  });
});

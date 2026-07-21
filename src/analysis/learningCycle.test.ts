import { describe, expect, it } from "vitest";
import { selectPrimaryReviewItem } from "./learningCycle";

const candidate = (
  verdict: "inaccuracy" | "mistake" | "blunder",
  evaluationLoss: number,
  positionIndex: number,
  bestMove = "e2e4",
) => ({ verdict, evaluationLoss, positionIndex, bestMove });

describe("learning cycle", () => {
  it("selects the most severe trainable mistake", () => {
    const main = selectPrimaryReviewItem([
      candidate("mistake", 1.4, 4),
      candidate("blunder", 2.1, 8),
      candidate("inaccuracy", 0.7, 2),
    ]);

    expect(main?.positionIndex).toBe(8);
  });

  it("uses evaluation loss and then the earlier moment as tie breakers", () => {
    const main = selectPrimaryReviewItem([
      candidate("blunder", 2.4, 10),
      candidate("blunder", 3.2, 12),
      candidate("blunder", 3.2, 6),
    ]);

    expect(main?.positionIndex).toBe(6);
  });

  it("ignores moments that cannot be trained", () => {
    expect(selectPrimaryReviewItem([
      candidate("blunder", 4.2, 3, ""),
    ])).toBeNull();
  });
});

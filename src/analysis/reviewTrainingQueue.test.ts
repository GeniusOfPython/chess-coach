import { describe, expect, it } from "vitest";
import type { GameReviewItem } from "./gameReview";
import {
  advanceReviewTrainingQueue,
  createReviewTrainingQueue,
  getCurrentReviewTrainingItem,
} from "./reviewTrainingQueue";

const item = (id: string, bestMove: string | null = "e2e4"): GameReviewItem => ({
  id,
  positionFen: "start",
  positionIndex: 0,
  moveNumber: 1,
  side: "w",
  playedMove: "d2d4",
  bestMove,
  verdict: "mistake",
  evaluationBeforeWhite: 0,
  evaluationAfterWhite: -1,
  evaluationLoss: 1,
  isPlayerDecision: true,
});

describe("review training queue", () => {
  it("keeps the ranked order, removes duplicates and limits the session", () => {
    const queue = createReviewTrainingQueue([
      item("first"),
      item("first"),
      item("second"),
      item("third"),
      item("fourth"),
    ]);

    expect(queue?.items.map(({ id }) => id)).toEqual(["first", "second", "third"]);
  });

  it("advances until the last position", () => {
    const queue = createReviewTrainingQueue([item("first"), item("second")]);
    const next = advanceReviewTrainingQueue(queue!);

    expect(getCurrentReviewTrainingItem(next)?.id).toBe("second");
    expect(advanceReviewTrainingQueue(next!)).toBeNull();
  });

  it("ignores positions that cannot be trained", () => {
    expect(createReviewTrainingQueue([item("missing", null)])).toBeNull();
  });
});

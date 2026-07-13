import { describe, expect, it } from "vitest";
import {
  addLearningJournalItem,
  type LearningJournalItem,
} from "./learningJournal";

const item: LearningJournalItem = {
  id: "position-e2e4",
  moveNumber: 1,
  side: "w",
  playedMove: "e2e4",
  bestMove: "d2d4",
  verdict: "inaccuracy",
  evaluationLoss: 0.4,
};

describe("learning journal", () => {
  it("adds the newest item first", () => {
    expect(addLearningJournalItem([], item)).toEqual([item]);
  });

  it("does not add the same position and move twice", () => {
    expect(addLearningJournalItem([item], item)).toEqual([item]);
  });

  it("keeps the configured maximum number of items", () => {
    const secondItem = { ...item, id: "position-d2d4" };
    expect(addLearningJournalItem([item], secondItem, 1)).toEqual([secondItem]);
  });
});

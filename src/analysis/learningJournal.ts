import type { Color } from "chess.js";
import type { MoveReviewVerdict } from "./reviewTypes";

export type LearningJournalItem = {
  id: string;
  moveNumber: number;
  side: Color;
  playedMove: string;
  bestMove: string;
  verdict: MoveReviewVerdict;
  evaluationLoss: number;
};

export function addLearningJournalItem(
  items: LearningJournalItem[],
  item: LearningJournalItem,
  limit = 12,
) {
  if (items.some((existingItem) => existingItem.id === item.id)) {
    return items;
  }

  return [item, ...items].slice(0, limit);
}

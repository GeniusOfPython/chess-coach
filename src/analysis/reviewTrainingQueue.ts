import type { GameReviewItem } from "./gameReview";

export type ReviewTrainingQueue = {
  items: GameReviewItem[];
  currentIndex: number;
};

export function createReviewTrainingQueue(
  items: GameReviewItem[],
  limit = 3,
): ReviewTrainingQueue | null {
  const unique = new Map<string, GameReviewItem>();

  items.forEach((item) => {
    const isError = item.verdict === "inaccuracy" ||
      item.verdict === "mistake" ||
      item.verdict === "blunder";

    if (item.isPlayerDecision && item.bestMove && isError && !unique.has(item.id)) {
      unique.set(item.id, item);
    }
  });

  const trainable = [...unique.values()].slice(0, Math.max(0, limit));

  return trainable.length > 0
    ? { items: trainable, currentIndex: 0 }
    : null;
}

export function getCurrentReviewTrainingItem(
  queue: ReviewTrainingQueue | null,
) {
  return queue?.items[queue.currentIndex] ?? null;
}

export function advanceReviewTrainingQueue(
  queue: ReviewTrainingQueue,
): ReviewTrainingQueue | null {
  const nextIndex = queue.currentIndex + 1;

  return nextIndex < queue.items.length
    ? { ...queue, currentIndex: nextIndex }
    : null;
}

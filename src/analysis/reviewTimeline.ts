import type { GameReviewItem } from "./gameReview";

export type TurningPoint = {
  item: GameReviewItem;
  importance: number;
  reason: string;
};

const verdictValue: Record<GameReviewItem["verdict"], number> = {
  blunder: 3,
  mistake: 2,
  inaccuracy: 1,
  best: 0,
  good: 0,
  unknown: 0,
};

function getMoverEvaluation(item: GameReviewItem, value: number) {
  return item.side === "w" ? value : -value;
}

function getIrreversibilityScore(item: GameReviewItem) {
  if (item.evaluationAfterWhite === null) {
    return 0;
  }

  const before = getMoverEvaluation(item, item.evaluationBeforeWhite);
  const after = getMoverEvaluation(item, item.evaluationAfterWhite);

  if (before >= 0.75 && after <= -0.75) {
    return 3;
  }

  if (before >= 1.5 && after < 0.35) {
    return 2;
  }

  if (before >= -0.35 && after <= -1.5) {
    return 2;
  }

  return before >= 0 && after < 0 ? 1 : 0;
}

function getReason(item: GameReviewItem, irreversibility: number) {
  if (irreversibility >= 3) {
    return "Перевес перешёл к сопернику";
  }

  if (irreversibility === 2) {
    return "Позиция изменилась надолго";
  }

  if ((item.evaluationLoss ?? 0) >= 1.5) {
    return "Потеряно значительное преимущество";
  }

  if (item.verdict === "mistake") {
    return "Ход заметно ухудшил позицию";
  }

  return "Полезный момент для тренировки";
}

export function rankTurningPoints(
  items: GameReviewItem[],
  limit = 3,
): TurningPoint[] {
  return items
    .filter((item) =>
      item.isPlayerDecision &&
      verdictValue[item.verdict] > 0 &&
      Boolean(item.bestMove),
    )
    .map((item) => {
      const irreversibility = getIrreversibilityScore(item);
      const importance =
        (item.evaluationLoss ?? 0) * 100 +
        verdictValue[item.verdict] * 24 +
        irreversibility * 18;

      return {
        item,
        importance,
        reason: getReason(item, irreversibility),
      };
    })
    .sort((left, right) =>
      right.importance - left.importance ||
      left.item.positionIndex - right.item.positionIndex,
    )
    .slice(0, Math.max(0, limit));
}


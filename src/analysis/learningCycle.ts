import type { MoveReviewVerdict } from "./reviewTypes";

type ReviewCandidate = {
  verdict: MoveReviewVerdict;
  evaluationLoss: number | null;
  positionIndex: number;
  bestMove: string | null;
};

const verdictPriority: Record<MoveReviewVerdict, number> = {
  blunder: 3,
  mistake: 2,
  inaccuracy: 1,
  best: 0,
  good: 0,
  unknown: 0,
};

export function selectPrimaryReviewItem<T extends ReviewCandidate>(
  items: T[],
): T | null {
  const candidates = items.filter(
    (item) => verdictPriority[item.verdict] > 0 && item.bestMove,
  );

  if (candidates.length === 0) {
    return null;
  }

  return [...candidates].sort((left, right) => {
    const verdictDifference =
      verdictPriority[right.verdict] - verdictPriority[left.verdict];

    if (verdictDifference !== 0) {
      return verdictDifference;
    }

    const lossDifference =
      (right.evaluationLoss ?? 0) - (left.evaluationLoss ?? 0);

    if (lossDifference !== 0) {
      return lossDifference;
    }

    return left.positionIndex - right.positionIndex;
  })[0] ?? null;
}

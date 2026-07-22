import { useEffect, useMemo, useState } from "react";
import type { GameReviewItem } from "../analysis/gameReview";
import {
  addReviewItemsToRepetitionQueue,
  getDueRepetitionItems,
  getSpacedRepetitionSummary,
  recordRepetitionResult,
} from "../analysis/spacedRepetition";
import { spacedRepetitionRepository } from "../repositories/spacedRepetitionRepository";
import { buildWeeklyTrainingPlan } from "../analysis/weeklyTrainingPlan";

export function useSpacedRepetition() {
  const [items, setItems] = useState(() => spacedRepetitionRepository.load());

  useEffect(() => {
    spacedRepetitionRepository.save(items);
  }, [items]);

  const dueItems = useMemo(() => getDueRepetitionItems(items), [items]);
  const summary = useMemo(() => getSpacedRepetitionSummary(items), [items]);
  const weeklyPlan = useMemo(() => buildWeeklyTrainingPlan(items), [items]);

  function addReviewItems(reviewItems: GameReviewItem[]) {
    setItems((current) => addReviewItemsToRepetitionQueue(current, reviewItems));
  }

  function recordResult(
    id: string,
    solved: boolean,
    hintLevel: number,
  ) {
    setItems((current) =>
      recordRepetitionResult(current, id, solved, hintLevel),
    );
  }

  function clear() {
    setItems([]);
  }

  return {
    items,
    dueItems,
    summary,
    weeklyPlan,
    addReviewItems,
    recordResult,
    clear,
  };
}

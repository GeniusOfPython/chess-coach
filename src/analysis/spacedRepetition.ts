import type { Color } from "chess.js";
import type { GameReviewItem } from "./gameReview";
import { detectTacticalMotifs } from "./tacticalMotifs";
import type { MoveReviewVerdict } from "./reviewTypes";

export type TrainingThemeId =
  | "mate"
  | "checks"
  | "captures"
  | "forks"
  | "tempo"
  | "promotion"
  | "king_safety"
  | "calculation";

export const trainingThemeLabels: Record<TrainingThemeId, string> = {
  mate: "Матовые мотивы",
  checks: "Форсирующие шахи",
  captures: "Взятия и материал",
  forks: "Двойные угрозы",
  tempo: "Темповые атаки",
  promotion: "Проходные пешки",
  king_safety: "Безопасность короля",
  calculation: "Расчёт вариантов",
};

export type SpacedRepetitionItem = {
  id: string;
  positionFen: string;
  bestMove: string;
  moveNumber: number;
  side: Color;
  playedMove: string;
  verdict: MoveReviewVerdict;
  evaluationBeforeWhite: number;
  evaluationAfterWhite: number | null;
  evaluationLoss: number | null;
  theme: TrainingThemeId;
  attempts: number;
  successes: number;
  lapses: number;
  intervalDays: number;
  dueAt: string;
  lastReviewedAt: string | null;
  reviewHistory: RepetitionReviewRecord[];
  createdAt: string;
  updatedAt: string;
};

export type RepetitionReviewRecord = {
  reviewedAt: string;
  independent: boolean;
};

export type SpacedRepetitionSummary = {
  total: number;
  due: number;
  weakTheme: TrainingThemeId | null;
  weakThemeLabel: string | null;
};

const intervalSteps = [1, 3, 7, 14, 30] as const;

function addDays(isoDate: string, days: number) {
  const date = new Date(isoDate);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString();
}

export function identifyTrainingTheme(
  positionFen: string,
  bestMove: string,
): TrainingThemeId {
  const motif = detectTacticalMotifs(positionFen, bestMove)[0]?.id;

  if (motif === "mate") return "mate";
  if (motif === "check") return "checks";
  if (motif === "capture") return "captures";
  if (motif === "fork") return "forks";
  if (motif === "queen-attack") return "tempo";
  if (motif === "promotion") return "promotion";
  if (motif === "castle") return "king_safety";
  return "calculation";
}

export function addReviewItemsToRepetitionQueue(
  current: SpacedRepetitionItem[],
  reviewItems: GameReviewItem[],
  now = new Date().toISOString(),
  limit = 120,
) {
  const itemsById = new Map(current.map((item) => [item.id, item]));

  reviewItems.forEach((item) => {
    if (!item.bestMove || !item.isPlayerDecision) return;
    if (!new Set(["inaccuracy", "mistake", "blunder"]).has(item.verdict)) return;

    const existing = itemsById.get(item.id);
    itemsById.set(item.id, existing
      ? {
          ...existing,
          positionFen: item.positionFen,
          bestMove: item.bestMove,
          playedMove: item.playedMove,
          verdict: item.verdict,
          evaluationBeforeWhite: item.evaluationBeforeWhite,
          evaluationAfterWhite: item.evaluationAfterWhite,
          evaluationLoss: item.evaluationLoss,
          updatedAt: now,
        }
      : {
          id: item.id,
          positionFen: item.positionFen,
          bestMove: item.bestMove,
          moveNumber: item.moveNumber,
          side: item.side,
          playedMove: item.playedMove,
          verdict: item.verdict,
          evaluationBeforeWhite: item.evaluationBeforeWhite,
          evaluationAfterWhite: item.evaluationAfterWhite,
          evaluationLoss: item.evaluationLoss,
          theme: identifyTrainingTheme(item.positionFen, item.bestMove),
          attempts: 0,
          successes: 0,
          lapses: 0,
          intervalDays: 0,
          dueAt: now,
          lastReviewedAt: null,
          reviewHistory: [],
          createdAt: now,
          updatedAt: now,
        });
  });

  return [...itemsById.values()]
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    .slice(0, Math.max(0, limit));
}

export function recordRepetitionResult(
  items: SpacedRepetitionItem[],
  id: string,
  solved: boolean,
  hintLevel: number,
  now = new Date().toISOString(),
) {
  return items.map((item) => {
    if (item.id !== id) return item;

    const independentSuccess = solved && hintLevel === 0;
    const currentStep = intervalSteps.indexOf(
      item.intervalDays as (typeof intervalSteps)[number],
    );
    const nextStep = currentStep < 0
      ? 0
      : Math.min(currentStep + 1, intervalSteps.length - 1);
    const intervalDays = independentSuccess
      ? (intervalSteps[nextStep] ?? intervalSteps[0])
      : 1;
    const historyCutoff = addDays(now, -56);
    const reviewHistory = [...(item.reviewHistory ?? []), {
      reviewedAt: now,
      independent: independentSuccess,
    }].filter(({ reviewedAt }) => reviewedAt >= historyCutoff).slice(-64);

    return {
      ...item,
      attempts: item.attempts + 1,
      successes: item.successes + (independentSuccess ? 1 : 0),
      lapses: item.lapses + (independentSuccess ? 0 : 1),
      intervalDays,
      dueAt: addDays(now, intervalDays),
      lastReviewedAt: now,
      reviewHistory,
      updatedAt: now,
    };
  });
}

export function getDueRepetitionItems(
  items: SpacedRepetitionItem[],
  now = new Date().toISOString(),
  limit = 5,
) {
  return items
    .filter((item) => item.dueAt <= now)
    .sort((left, right) => {
      const dueOrder = left.dueAt.localeCompare(right.dueAt);
      return dueOrder || right.lapses - left.lapses;
    })
    .slice(0, Math.max(0, limit));
}

export function getSpacedRepetitionSummary(
  items: SpacedRepetitionItem[],
  now = new Date().toISOString(),
): SpacedRepetitionSummary {
  const themeScores = new Map<TrainingThemeId, number>();

  items.forEach((item) => {
    const unsolvedAttempts = item.attempts - item.successes;
    const severity = item.verdict === "blunder" ? 3 : item.verdict === "mistake" ? 2 : 1;
    const score = severity + item.lapses * 3 + unsolvedAttempts * 2;
    themeScores.set(item.theme, (themeScores.get(item.theme) ?? 0) + score);
  });

  const weakTheme = [...themeScores.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))[0]?.[0] ?? null;

  return {
    total: items.length,
    due: getDueRepetitionItems(items, now, Number.POSITIVE_INFINITY).length,
    weakTheme,
    weakThemeLabel: weakTheme ? trainingThemeLabels[weakTheme] : null,
  };
}

export function repetitionItemToGameReviewItem(
  item: SpacedRepetitionItem,
): GameReviewItem {
  return {
    id: item.id,
    positionFen: item.positionFen,
    positionIndex: 0,
    moveNumber: item.moveNumber,
    side: item.side,
    playedMove: item.playedMove,
    bestMove: item.bestMove,
    verdict: item.verdict,
    evaluationBeforeWhite: item.evaluationBeforeWhite,
    evaluationAfterWhite: item.evaluationAfterWhite,
    evaluationLoss: item.evaluationLoss,
    isPlayerDecision: true,
  };
}

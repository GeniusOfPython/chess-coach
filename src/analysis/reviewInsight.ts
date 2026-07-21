import type { Color } from "chess.js";
import { detectTacticalMotifs } from "./tacticalMotifs";
import { explainEngineMove } from "../utils/explainMove";

export type ReviewInsightInput = {
  positionFen: string;
  side: Color;
  playedMove: string;
  bestMove: string | null;
  evaluationBeforeWhite: number;
  evaluationAfterWhite: number | null;
  evaluationLoss: number | null;
};

export type ReviewInsight = {
  title: string;
  summary: string;
  facts: string[];
  trainingFocus: string;
};

function formatMove(move: string | null) {
  if (!move || move === "(none)") {
    return "—";
  }

  const promotion = move.slice(4);
  const route = `${move.slice(0, 2)} → ${move.slice(2, 4)}`;

  return promotion ? `${route}=${promotion.toUpperCase()}` : route;
}

function getMoverEvaluation(side: Color, value: number) {
  return side === "w" ? value : -value;
}

function getPositionShift(input: ReviewInsightInput) {
  if (input.evaluationAfterWhite === null) {
    return null;
  }

  const before = getMoverEvaluation(input.side, input.evaluationBeforeWhite);
  const after = getMoverEvaluation(input.side, input.evaluationAfterWhite);

  if (before >= 0.75 && after <= -0.75) {
    return "После хода перевес перешёл к сопернику.";
  }

  if (before >= 1.5 && after < 0.35) {
    return "Ход почти полностью отдал накопленный перевес.";
  }

  if (before >= -0.35 && after <= -1.5) {
    return "После хода позиция стала устойчиво хуже.";
  }

  return null;
}

function getFallbackTitle(input: ReviewInsightInput) {
  const shift = getPositionShift(input);

  if (shift?.includes("перешёл")) {
    return "Перевес отдан сопернику";
  }

  if ((input.evaluationLoss ?? 0) >= 3) {
    return "Решающая потеря позиции";
  }

  if ((input.evaluationLoss ?? 0) >= 1.5) {
    return "Сильное ухудшение позиции";
  }

  return "Упущено более точное продолжение";
}

const trainingFocusByMotif: Record<string, string> = {
  mate: "Перед позиционным ходом проверяй все доступные маты.",
  check: "Начинай расчёт с шахов и проверяй вынужденные ответы соперника.",
  capture: "Перед ходом сравни все взятия и стоимость фигур на целевых полях.",
  promotion: "Сначала оцени проходные пешки и возможность немедленного превращения.",
  fork: "Ищи ходы, которые одновременно создают две угрозы.",
  "queen-attack": "Ищи темповые нападения на ферзя и незащищённые фигуры.",
  castle: "Проверяй безопасность короля и возможность быстро завершить развитие.",
};

export function buildReviewInsight(input: ReviewInsightInput): ReviewInsight {
  if (!input.bestMove) {
    return {
      title: getFallbackTitle(input),
      summary: `Ход ${formatMove(input.playedMove)} ухудшил позицию, но точное продолжение не сохранено.`,
      facts: getPositionShift(input) ? [getPositionShift(input)!] : [],
      trainingFocus: "Перед ходом сравни минимум два разумных продолжения.",
    };
  }

  const motifs = detectTacticalMotifs(input.positionFen, input.bestMove);
  const primaryMotif = motifs[0];
  const explanations = explainEngineMove(input.positionFen, input.bestMove);
  const shift = getPositionShift(input);
  const facts = [
    shift,
    primaryMotif?.description,
    explanations.find((item) => item !== primaryMotif?.description),
  ].filter((item): item is string => Boolean(item));

  const loss = input.evaluationLoss;
  const lossText = loss === null
    ? ""
    : ` Потеря оценки: ${loss.toFixed(2)}.`;

  return {
    title: primaryMotif
      ? `Упущен мотив: ${primaryMotif.title}`
      : getFallbackTitle(input),
    summary: `Сыграно ${formatMove(input.playedMove)}, сильнее было ${formatMove(input.bestMove)}.${lossText}`,
    facts: [...new Set(facts)].slice(0, 3),
    trainingFocus: primaryMotif
      ? trainingFocusByMotif[primaryMotif.id] ?? "Сначала проверяй самые активные продолжения."
      : "Перед ходом проверь шахи, взятия, угрозы и только затем позиционные продолжения.",
  };
}

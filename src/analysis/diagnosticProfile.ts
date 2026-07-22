import type { GameReviewItem } from "./gameReview";
import {
  identifyTrainingTheme,
  trainingThemeLabels,
} from "./spacedRepetition";
import type { BotLevelId } from "../types/bot";

export type LearningGoal =
  | "reduce_mistakes"
  | "understand_positions"
  | "build_habit";

export type ExperienceLevel = "beginner" | "basic" | "regular";

export type DiagnosticProfile = {
  decisionCount: number;
  accuracy: number;
  level: "foundation" | "developing" | "confident" | "insufficient";
  levelLabel: string;
  focusLabel: string | null;
  mistakes: number;
  blunders: number;
  recommendedBotLevel: BotLevelId;
  summary: string;
  nextStep: string;
};

const verdictScores: Record<GameReviewItem["verdict"], number | null> = {
  best: 100,
  good: 92,
  inaccuracy: 72,
  mistake: 42,
  blunder: 12,
  unknown: null,
};

const verdictSeverity: Record<GameReviewItem["verdict"], number> = {
  best: 0,
  good: 0,
  inaccuracy: 1,
  mistake: 2,
  blunder: 3,
  unknown: 0,
};

export function getDiagnosticBotLevel(
  experience: ExperienceLevel,
): BotLevelId {
  if (experience === "regular") {
    return "club";
  }

  return experience === "basic" ? "casual" : "beginner";
}

function findFocusLabel(items: GameReviewItem[]) {
  const mainError = [...items]
    .filter((item) =>
      item.bestMove &&
      (item.verdict === "inaccuracy" ||
        item.verdict === "mistake" ||
        item.verdict === "blunder"),
    )
    .sort((left, right) =>
      verdictSeverity[right.verdict] - verdictSeverity[left.verdict] ||
      (right.evaluationLoss ?? 0) - (left.evaluationLoss ?? 0) ||
      left.positionIndex - right.positionIndex,
    )[0];

  if (!mainError?.bestMove) {
    return null;
  }

  return trainingThemeLabels[
    identifyTrainingTheme(mainError.positionFen, mainError.bestMove)
  ];
}

export function buildDiagnosticProfile(
  items: GameReviewItem[],
  goal: LearningGoal,
): DiagnosticProfile {
  const playerDecisions = items.filter((item) => item.isPlayerDecision);
  const scoredDecisions = playerDecisions.flatMap((item) => {
    const score = verdictScores[item.verdict];
    return score === null ? [] : [score];
  });
  const decisionCount = scoredDecisions.length;
  const accuracy = decisionCount === 0
    ? 0
    : Math.round(
        scoredDecisions.reduce((sum, score) => sum + score, 0) / decisionCount,
      );
  const mistakes = playerDecisions.filter(
    ({ verdict }) => verdict === "mistake",
  ).length;
  const blunders = playerDecisions.filter(
    ({ verdict }) => verdict === "blunder",
  ).length;
  const focusLabel = findFocusLabel(playerDecisions);
  const nextStep = goal === "build_habit"
    ? "Выполняй недельный план короткими сериями без подсказок."
    : goal === "understand_positions"
      ? `Начни с объяснений${focusLabel ? ` по теме «${focusLabel}»` : " ключевых решений"}.`
      : "Перед каждым ходом проверяй угрозы, шахи, взятия и незащищённые фигуры.";

  if (decisionCount < 3) {
    return {
      decisionCount,
      accuracy,
      level: "insufficient",
      levelLabel: "Недостаточно данных",
      focusLabel,
      mistakes,
      blunders,
      recommendedBotLevel: "casual",
      summary: "Для устойчивого вывода нужна ещё одна более длинная партия.",
      nextStep,
    };
  }

  if (accuracy >= 86 && blunders === 0) {
    return {
      decisionCount,
      accuracy,
      level: "confident",
      levelLabel: "Уверенный любитель",
      focusLabel,
      mistakes,
      blunders,
      recommendedBotLevel: "club",
      summary: "База устойчива. Следующий рост даст работа над качеством расчёта.",
      nextStep,
    };
  }

  if (accuracy >= 66 && blunders <= 1) {
    return {
      decisionCount,
      accuracy,
      level: "developing",
      levelLabel: "База сформирована",
      focusLabel,
      mistakes,
      blunders,
      recommendedBotLevel: "casual",
      summary: "Основы работают, но ключевые решения пока требуют закрепления.",
      nextStep,
    };
  }

  return {
    decisionCount,
    accuracy,
    level: "foundation",
    levelLabel: "Формирование основы",
    focusLabel,
    mistakes,
    blunders,
    recommendedBotLevel: "beginner",
    summary: "Главная задача — сократить грубые потери и проверять угрозы перед ходом.",
    nextStep,
  };
}

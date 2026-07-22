import { useState } from "react";
import type { Chess, Color } from "chess.js";
import {
  getTurnFromFen,
  isMoveMatchingBestMove,
} from "../analysis/reviewRules";
import type { GameReviewItem } from "../analysis/gameReview";
import {
  advanceReviewTrainingQueue,
  createReviewTrainingQueue,
  getCurrentReviewTrainingItem,
  type ReviewTrainingQueue,
} from "../analysis/reviewTrainingQueue";
import type { RewardToastMessage } from "../components/RewardToast";
import type { WorkspaceId } from "../game/workspaceNavigation";
import type { GameMode } from "../game/gameTypes";
import { useBestMoveTraining } from "../hooks/useBestMoveTraining";
import { useGameReview } from "../hooks/useGameReview";
import { useLearningJournal } from "../hooks/useLearningJournal";
import { useMoveReview } from "../hooks/useMoveReview";
import { useTrainingProgress } from "../hooks/useTrainingProgress";
import {
  triggerSuccessHaptic,
  triggerWarningHaptic,
} from "../platform/nativeBridge";
import { trackProductEvent } from "../platform/analytics/analyticsClient";
import type { EngineAnalysis } from "../types/chess";
import {
  identifyTrainingTheme,
  repetitionItemToGameReviewItem,
  trainingThemeLabels,
} from "../analysis/spacedRepetition";
import { useSpacedRepetition } from "../hooks/useSpacedRepetition";

type ReviewMove = { from: string; to: string };

type AnalyzePosition = (options: {
  fen: string;
  turn: Color;
  isGameOver: boolean;
}) => Promise<void>;

type CalculatePositionAnalysis = (options: {
  fen: string;
  isGameOver: boolean;
  movetime?: number;
}) => Promise<EngineAnalysis | null>;

type CalculateGameReviewAnalysis = (options: {
  fen: string;
  isGameOver: boolean;
  movetime?: number;
  timeoutMs?: number;
  signal?: AbortSignal;
}) => Promise<EngineAnalysis | null>;

type CompletedPlayerMove = {
  playedMove: string;
  positionBeforeMove: string;
  positionAfterMove: string;
  movingSide: Color;
  suggestedBestMove: string | null;
  evaluationBeforeWhite: number | null;
};

type UseLearningFlowOptions = {
  game: Chess;
  gameMode: GameMode;
  playerSide: Color;
  position: string;
  displayedPosition: string;
  isViewingCurrentPosition: boolean;
  isBotThinking: boolean;
  isActiveBotGame: boolean;
  fenHistory: string[];
  lastMoveHistory: ReviewMove[];
  analyzePosition: AnalyzePosition;
  calculatePositionAnalysis: CalculatePositionAnalysis;
  calculateGameReviewAnalysis: CalculateGameReviewAnalysis;
  clearAnalysis: () => void;
  setLastMoveReview: Parameters<typeof useMoveReview>[0]["setLastMoveReview"];
  setSelectedSquare: (square: string | null) => void;
  setIsBotThinking: (value: boolean) => void;
  setIsBotGameStarted: (value: boolean) => void;
  setGameMode: (mode: GameMode) => void;
  clearGameTermination: () => void;
  viewMove: (positionIndex: number) => void;
  loadFen: (fen: string) => boolean;
  setActiveWorkspace: (workspace: WorkspaceId | null) => void;
  showRewardToast: (message: Omit<RewardToastMessage, "id">) => void;
};

export function useLearningFlow({
  game,
  gameMode,
  playerSide,
  position,
  displayedPosition,
  isViewingCurrentPosition,
  isBotThinking,
  isActiveBotGame,
  fenHistory,
  lastMoveHistory,
  analyzePosition,
  calculatePositionAnalysis,
  calculateGameReviewAnalysis,
  clearAnalysis,
  setLastMoveReview,
  setSelectedSquare,
  setIsBotThinking,
  setIsBotGameStarted,
  setGameMode,
  clearGameTermination,
  viewMove,
  loadFen,
  setActiveWorkspace,
  showRewardToast,
}: UseLearningFlowOptions) {
  const [reviewTrainingQueue, setReviewTrainingQueue] =
    useState<ReviewTrainingQueue | null>(null);
  const {
    task,
    resetTask,
    prepareTask,
    failTask,
    readyTask,
    revealHint,
    completeTask,
  } = useBestMoveTraining();
  const {
    currentStreak,
    bestStreak,
    totalAttempts,
    totalSuccesses,
    dailySuccesses,
    dailyGoal,
    recordAttempt,
    resetStats,
  } = useTrainingProgress({
    onDailyGoalReached: () => showRewardToast({
      kind: "success",
      title: "Цель дня выполнена",
      text: "Пять лучших ходов найдены. Можно закончить на хорошем результате или продолжить серию.",
    }),
  });
  const repetition = useSpacedRepetition();
  const {
    items: journalItems,
    addItem: addJournalItem,
    clearItems: clearJournal,
  } = useLearningJournal();
  const {
    status: reviewStatus,
    items: reviewItems,
    progress: reviewProgress,
    error: reviewError,
    restoredProgress: reviewRestoredProgress,
    cachedPositions: reviewCachedPositions,
    run: runReview,
    pause: pauseReview,
    reset: clearReview,
  } = useGameReview();
  const { reviewMove } = useMoveReview({
    calculatePositionAnalysis,
    setLastMoveReview,
    addLearningJournalItem: addJournalItem,
    showRewardToast,
  });

  function loadTrainingPosition(fen: string) {
    if (isBotThinking) {
      return false;
    }

    setSelectedSquare(null);

    if (!loadFen(fen)) {
      return false;
    }

    setGameMode("analysis");
    setIsBotGameStarted(false);
    setIsBotThinking(false);
    setLastMoveReview(null);
    clearGameTermination();
    clearJournal();
    clearReview();
    resetTask();
    clearAnalysis();
    return true;
  }

  function resetTrainingFlow() {
    setReviewTrainingQueue(null);
    resetTask();
  }

  function getTrainingContext(
    item: GameReviewItem,
    sequenceIndex: number,
    sequenceTotal: number,
    source: ReviewTrainingQueue["source"],
  ) {
    const repetitionItem = repetition.items.find(({ id }) => id === item.id);

    return {
      kind: "review" as const,
      source,
      repetitionId: item.id,
      themeLabel: repetitionItem
        ? trainingThemeLabels[repetitionItem.theme]
        : item.bestMove
          ? trainingThemeLabels[identifyTrainingTheme(item.positionFen, item.bestMove)]
          : null,
      moveNumber: item.moveNumber,
      side: item.side,
      playedMove: item.playedMove,
      verdict: item.verdict === "blunder" || item.verdict === "mistake"
        ? item.verdict
        : "inaccuracy" as const,
      evaluationBeforeWhite: item.evaluationBeforeWhite,
      evaluationAfterWhite: item.evaluationAfterWhite,
      evaluationLoss: item.evaluationLoss,
      sequenceIndex,
      sequenceTotal,
    };
  }

  function analyzeCurrentPosition() {
    if (isActiveBotGame) {
      return;
    }

    resetTrainingFlow();
    void analyzePosition({
      fen: displayedPosition,
      turn: getTurnFromFen(displayedPosition),
      isGameOver: isViewingCurrentPosition && game.isGameOver(),
    });
  }

  async function runGameReview() {
    if (isBotThinking || reviewStatus === "running") {
      return;
    }

    const totalPositions = Math.min(
      lastMoveHistory.length,
      Math.max(0, fenHistory.length - 1),
      24,
    );

    if (totalPositions === 0) {
      return;
    }

    trackProductEvent("review_started", {
      mode: gameMode,
      totalPositions,
    });
    const result = await runReview({
      fenHistory,
      moveHistory: lastMoveHistory,
      calculatePositionAnalysis: calculateGameReviewAnalysis,
      reviewSide: gameMode === "bot" ? playerSide : undefined,
    });

    if (result) {
      trackProductEvent("review_finished", result);
    }
  }

  function selectReviewedPosition(item: GameReviewItem) {
    setSelectedSquare(null);
    clearAnalysis();
    resetTrainingFlow();
    viewMove(item.positionIndex);
  }

  async function startBestMoveTraining() {
    if (
      isBotThinking ||
      isActiveBotGame ||
      !isViewingCurrentPosition ||
      game.isGameOver()
    ) {
      return;
    }

    const trainingFen = position;

    setReviewTrainingQueue(null);
    setSelectedSquare(null);
    clearAnalysis();
    prepareTask(trainingFen);

    const trainingAnalysis = await calculatePositionAnalysis({
      fen: trainingFen,
      isGameOver: game.isGameOver(),
      movetime: 1400,
    });

    if (!trainingAnalysis?.bestMove) {
      failTask("Не удалось подготовить задачу из текущей позиции.");
      return;
    }

    readyTask(trainingFen, trainingAnalysis.bestMove);
    trackProductEvent("training_started", {
      source: "current_position",
      sequenceTotal: 1,
    });
  }

  function startReviewTraining(
    items: GameReviewItem[],
    source: ReviewTrainingQueue["source"] = "game_review",
  ) {
    const queue = createReviewTrainingQueue(items, source === "spaced_repetition" ? 5 : 3, source);
    const item = getCurrentReviewTrainingItem(queue);

    if (!queue || !item?.bestMove || !loadTrainingPosition(item.positionFen)) {
      showRewardToast({
        kind: "warning",
        title: "Позиция недоступна",
        text: "Не удалось открыть позицию для тренировки.",
      });
      return;
    }

    if (source === "game_review") {
      repetition.addReviewItems(queue.items);
    }

    setReviewTrainingQueue(queue);
    readyTask(
      item.positionFen,
      item.bestMove,
      getTrainingContext(item, 1, queue.items.length, source),
    );
    trackProductEvent("training_started", {
      source,
      sequenceTotal: queue.items.length,
    });
    setActiveWorkspace("coach");
    showRewardToast({
      kind: "success",
      title: queue.items.length > 1 ? "Серия тренировок готова" : "Главная ошибка найдена",
      text: queue.items.length > 1
        ? `Подготовлено ${queue.items.length} ключевых момента. Начни с первого без подсказки.`
        : "Позиция возвращена на доску. Найди исправление без подсказки.",
    });
  }

  function practiceMainMistake(item: GameReviewItem) {
    startReviewTraining([item]);
  }

  function practiceReviewSequence(items: GameReviewItem[]) {
    startReviewTraining(items);
  }

  function startDueReviewTraining() {
    const dueItems = repetition.dueItems.map(repetitionItemToGameReviewItem);

    if (dueItems.length === 0) {
      showRewardToast({
        kind: "success",
        title: "Повторений нет",
        text: "Все сохранённые ошибки повторены по расписанию.",
      });
      return;
    }

    startReviewTraining(dueItems, "spaced_repetition");
  }

  function continueReviewTraining() {
    if (task.status !== "success" || !reviewTrainingQueue) {
      return;
    }

    const nextQueue = advanceReviewTrainingQueue(reviewTrainingQueue);
    const nextItem = getCurrentReviewTrainingItem(nextQueue);

    if (!nextQueue || !nextItem?.bestMove || !loadTrainingPosition(nextItem.positionFen)) {
      return;
    }

    setReviewTrainingQueue(nextQueue);
    readyTask(
      nextItem.positionFen,
      nextItem.bestMove,
      getTrainingContext(
        nextItem,
        nextQueue.currentIndex + 1,
        nextQueue.items.length,
        nextQueue.source,
      ),
    );
  }

  function retryBestMoveTraining() {
    const { positionFen, bestMove, context } = task;

    if (!positionFen || !bestMove || !loadTrainingPosition(positionFen)) {
      return;
    }

    readyTask(positionFen, bestMove, context);
  }

  function revealBestMoveHint() {
    if (task.status !== "ready") {
      return;
    }

    trackProductEvent("training_hint_revealed", {
      source: task.context?.source ?? "current_position",
      hintLevel: Math.min(task.hintLevel + 1, 3),
    });
    revealHint();
  }

  function completePlayerMove({
    playedMove,
    positionBeforeMove,
    positionAfterMove,
    movingSide,
    suggestedBestMove,
    evaluationBeforeWhite,
  }: CompletedPlayerMove) {
    const moveReview = isActiveBotGame
      ? null
      : reviewMove({
          playedMove,
          positionBeforeMove,
          positionAfterMove,
          movingSide,
          suggestedBestMove,
          evaluationBeforeWhite,
        });
    const matchedBestMove = moveReview?.matchedBestMove ?? false;

    clearReview();

    if (task.status === "ready" && task.positionFen === positionBeforeMove) {
      const trainingSolved = isMoveMatchingBestMove({
        playedMove,
        bestMove: task.bestMove,
      });

      recordAttempt(trainingSolved);
      completeTask(playedMove, trainingSolved);
      const sequencePosition = task.context?.sequenceIndex ?? 1;
      const sequenceTotal = task.context?.sequenceTotal ?? 1;
      const trainingSource = task.context
        ? task.context.source
        : "current_position" as const;

      if (task.context?.repetitionId) {
        repetition.recordResult(
          task.context.repetitionId,
          trainingSolved,
          task.hintLevel,
        );
      }

      trackProductEvent("training_attempted", {
        source: trainingSource,
        solved: trainingSolved,
        hintLevel: task.hintLevel,
        sequenceIndex: sequencePosition,
        sequenceTotal,
      });

      if (trainingSolved && sequencePosition === sequenceTotal) {
        trackProductEvent("training_sequence_completed", {
          source: trainingSource,
          sequenceTotal,
        });
      }

      showRewardToast(trainingSolved
        ? {
            kind: "success",
            title: sequenceTotal > 1
              ? `Момент ${sequencePosition} из ${sequenceTotal} решён`
              : "Лучший ход найден",
            text: sequenceTotal > 1 && sequencePosition < sequenceTotal
              ? "Результат сохранён. Перейди к следующей позиции."
              : "Ты самостоятельно нашёл сильнейшее продолжение.",
          }
        : {
            kind: "warning",
            title: "Почти",
            text: "Сравни свой ход с лучшим и попробуй понять мотив.",
          });
      void (trainingSolved ? triggerSuccessHaptic() : triggerWarningHaptic());
    } else if (task.status === "ready") {
      resetTask();
    }

    if (matchedBestMove && task.status !== "ready") {
      showRewardToast({
        kind: "success",
        title: "Сильный ход",
        text: "Ты сыграл рекомендованный вариант.",
      });
    }
  }

  return {
    training: {
      task,
      stats: {
        currentStreak,
        bestStreak,
        totalAttempts,
        totalSuccesses,
        dailyGoal,
        dailySuccesses,
      },
      repetition: repetition.summary,
      weeklyPlan: repetition.weeklyPlan,
      reset: resetTrainingFlow,
      resetStats,
      clearRepetition: repetition.clear,
    },
    review: {
      status: reviewStatus,
      items: reviewItems,
      progress: reviewProgress,
      error: reviewError,
      restoredProgress: reviewRestoredProgress,
      cachedPositions: reviewCachedPositions,
      pause: pauseReview,
      clear: clearReview,
    },
    journal: {
      items: journalItems,
      clear: clearJournal,
    },
    actions: {
      analyzeCurrentPosition,
      runGameReview,
      selectReviewedPosition,
      startBestMoveTraining,
      practiceMainMistake,
      practiceReviewSequence,
      startDueReviewTraining,
      continueReviewTraining,
      retryBestMoveTraining,
      revealBestMoveHint,
      completePlayerMove,
    },
    lifecycle: {
      clearJournal,
      clearReview,
      resetTraining: resetTrainingFlow,
    },
  };
}

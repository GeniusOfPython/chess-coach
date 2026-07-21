import type { Chess, Color } from "chess.js";
import {
  getTurnFromFen,
  isMoveMatchingBestMove,
} from "../analysis/reviewRules";
import type { GameReviewItem } from "../analysis/gameReview";
import type { RewardToastMessage } from "../components/RewardToast";
import type { WorkspaceId } from "../components/WorkspaceTabs";
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
import type { EngineAnalysis } from "../types/chess";

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

  function analyzeCurrentPosition() {
    if (isActiveBotGame) {
      return;
    }

    resetTask();
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

    await runReview({
      fenHistory,
      moveHistory: lastMoveHistory,
      calculatePositionAnalysis: calculateGameReviewAnalysis,
      reviewSide: gameMode === "bot" ? playerSide : undefined,
    });
  }

  function selectReviewedPosition(item: GameReviewItem) {
    setSelectedSquare(null);
    clearAnalysis();
    resetTask();
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
  }

  function practiceMainMistake(item: GameReviewItem) {
    if (!item.bestMove || !loadTrainingPosition(item.positionFen)) {
      showRewardToast({
        kind: "warning",
        title: "Позиция недоступна",
        text: "Не удалось открыть позицию для тренировки.",
      });
      return;
    }

    readyTask(item.positionFen, item.bestMove, {
      kind: "review",
      moveNumber: item.moveNumber,
      side: item.side,
      playedMove: item.playedMove,
      verdict: item.verdict === "blunder" || item.verdict === "mistake"
        ? item.verdict
        : "inaccuracy",
    });
    setActiveWorkspace("coach");
    showRewardToast({
      kind: "success",
      title: "Главная ошибка найдена",
      text: "Позиция возвращена на доску. Найди исправление без подсказки.",
    });
  }

  function retryBestMoveTraining() {
    const { positionFen, bestMove, context } = task;

    if (!positionFen || !bestMove || !loadTrainingPosition(positionFen)) {
      return;
    }

    readyTask(positionFen, bestMove, context);
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
      showRewardToast(trainingSolved
        ? {
            kind: "success",
            title: "Лучший ход найден",
            text: "Отлично: ты самостоятельно нашёл сильнейшее продолжение.",
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
      reset: resetTask,
      resetStats,
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
      retryBestMoveTraining,
      revealBestMoveHint: revealHint,
      completePlayerMove,
    },
    lifecycle: {
      clearJournal,
      clearReview,
      resetTraining: resetTask,
    },
  };
}

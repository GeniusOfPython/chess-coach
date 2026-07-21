import { useEffect, useRef, useState } from "react";
import { Chess, type Color, type Square } from "chess.js";
import type { GameReviewItem } from "../components/GameReviewPanel";
import { useChessGame } from "../hooks/useChessGame";
import { useEngineAnalysis } from "../hooks/useEngineAnalysis";
import { useAppPreferences } from "../hooks/useAppPreferences";
import {
  getTurnFromFen,
  getWhiteEvaluation,
  isMoveMatchingBestMove,
} from "../analysis/reviewRules";
import { getFeatureAccess } from "../features/featureAccess";
import type { AdsConsentStatus } from "../features/consent";
import { isNativeMobileShell } from "../platform/mobile";
import { writeStorageValue } from "../platform/appStorage";
import { gameSessionStorageKeys } from "../platform/storageKeys";
import { useTrainingProgress } from "../hooks/useTrainingProgress";
import { useGameReview } from "../hooks/useGameReview";
import { useRewardToast } from "../hooks/useRewardToast";
import { useGameSession } from "../hooks/useGameSession";
import {
  isBotTurn,
  isPlayerTurn as getIsPlayerTurn,
} from "../game/gameFlowRules";
import { useLearningJournal } from "../hooks/useLearningJournal";
import { useBestMoveTraining } from "../hooks/useBestMoveTraining";
import { useBotTurn } from "../hooks/useBotTurn";
import { useMoveReview } from "../hooks/useMoveReview";
import { useGameArchive } from "../hooks/useGameArchive";
import {
  createArchivedGame,
  type ArchivedGame,
} from "../game/gameArchive";
import {
  getGameResultInfo,
  getTerminatedGameResultInfo,
} from "../game/gameResult";
import { useChessAchievements } from "../hooks/useChessAchievements";
import { detectChessAchievements } from "../features/chessAchievements";
import { isBotFairPlayActive } from "../game/fairPlayRules";
import { createGameLifecycleActions } from "../game/gameLifecycle";
import type { GameMode } from "../game/gameTypes";
import {
  triggerErrorHaptic,
  triggerLightHaptic,
  triggerMoveHaptic,
  triggerSuccessHaptic,
  triggerWarningHaptic,
} from "../platform/nativeBridge";

export const INITIAL_POSITION_FEN = new Chess().fen();

export function useChessCoachController() {
  const {
    gameMode,
    setGameMode,
    playerSide,
    setPlayerSide,
    botLevelId,
    setBotLevelId,
    activeWorkspace,
    setActiveWorkspace,
    compactUi,
    setCompactUi,
    showAnalysisArrows,
    setShowAnalysisArrows,
    boardTheme,
    setBoardTheme,
    subscriptionTier,
    setSubscriptionTier,
    privacyConsent,
    updatePrivacyConsent,
    resetPrivacyConsent,
  } = useAppPreferences();

  const {
    isBotThinking,
    setIsBotThinking,
    isBotGameStarted,
    setIsBotGameStarted,
    botSessionId,
    startBotSession,
    lastMoveReview,
    setLastMoveReview,
    selectedSquare,
    setSelectedSquare,
    gameTermination,
    terminateBotGame,
    clearGameTermination,
  } = useGameSession();

  const {
    task: bestMoveTrainingTask,
    resetTask: resetBestMoveTraining,
    prepareTask: prepareBestMoveTraining,
    failTask: failBestMoveTraining,
    readyTask: readyBestMoveTraining,
    revealHint: revealBestMoveTrainingHint,
    completeTask: completeBestMoveTraining,
  } = useBestMoveTraining();

  const { message: rewardToast, showRewardToast } = useRewardToast();

  const {
    currentStreak: trainingCurrentStreak,
    bestStreak: trainingBestStreak,
    totalAttempts: trainingTotalAttempts,
    totalSuccesses: trainingTotalSuccesses,
    dailySuccesses: trainingDailySuccesses,
    dailyGoal: dailyTrainingGoal,
    recordAttempt: recordTrainingAttempt,
    resetStats: resetTrainingStats,
  } = useTrainingProgress({
    onDailyGoalReached: () => showRewardToast({
      kind: "success",
      title: "Цель дня выполнена",
      text: "Пять лучших ходов найдены. Можно закончить на хорошем результате или продолжить серию.",
    }),
  });

  const {
    items: learningJournalItems,
    addItem: addLearningJournalItem,
    clearItems: clearLearningJournal,
  } = useLearningJournal();

  const {
    status: gameReviewStatus,
    items: gameReviewItems,
    progress: gameReviewProgress,
    error: gameReviewError,
    run: runGameReview,
    reset: clearGameReview,
  } = useGameReview();

  const {
    games: archivedGames,
    addGame: addArchivedGame,
    removeGame: removeArchivedGame,
    clearGames: clearArchivedGames,
  } = useGameArchive();
  const archivedPositionRef = useRef<string | null>(null);
  const celebratedResultRef = useRef<string | null>(null);
  const achievementPositionRef = useRef<string | null>(null);
  const [showResultCelebration, setShowResultCelebration] = useState(false);

  const {
    unlocked: unlockedAchievements,
    unlock: unlockAchievements,
  } = useChessAchievements();

  const access = getFeatureAccess(subscriptionTier);
  const isNativeApp = isNativeMobileShell();
  const showAdvertisingUi = isNativeApp;

  const {
    analysis,
    analyzedTurn,
    isAnalyzing,
    error,
    analyzePosition,
    calculateBotMove,
    calculatePositionAnalysis,
    clearAnalysis,
  } = useEngineAnalysis();

  const { reviewMove } = useMoveReview({
    calculatePositionAnalysis,
    setLastMoveReview,
    addLearningJournalItem,
    showRewardToast,
  });

  const {
    game,
    position,
    displayedPosition,
    history,
    status,
    displayedLastMove,
    displayedCheckSquare,
    fenHistory,
    lastMoveHistory,
    viewedMoveIndex,
    isViewingCurrentPosition,
    onPieceDrop,
    newGame,
    undoMove,
    makeEngineMove,
    getFen,
    loadFen,
    getPgn,
    loadPgn,
    viewPreviousMove,
    viewNextMove,
    viewCurrentMove,
    viewMove,
  } = useChessGame({
    onPositionChanged: clearAnalysis,
  });

  const isMatchFinished = game.isGameOver() || gameTermination !== null;
  const finalResultInfo = isMatchFinished
    ? gameTermination
      ? getTerminatedGameResultInfo(gameTermination)
      : getGameResultInfo(game)
    : null;
  const showInitialBoard = isMatchFinished && isViewingCurrentPosition;

  useEffect(() => {
    writeStorageValue(gameSessionStorageKeys.currentPgn, getPgn());
  }, [position, history.length, getPgn]);

  useEffect(() => {
    if (!isMatchFinished || history.length === 0) {
      archivedPositionRef.current = null;
      return;
    }

    const pgn = getPgn();

    if (!pgn || archivedPositionRef.current === pgn) {
      return;
    }

    const resultInfo = gameTermination
      ? getTerminatedGameResultInfo(gameTermination)
      : getGameResultInfo(game);
    archivedPositionRef.current = pgn;
    addArchivedGame(createArchivedGame({
      pgn,
      mode: gameMode,
      playerSide,
      botLevelId,
      result: resultInfo.result,
      winner: resultInfo.winner,
      halfMoves: history.length,
    }));
  }, [
    addArchivedGame,
    botLevelId,
    game,
    gameTermination,
    gameMode,
    getPgn,
    history.length,
    isMatchFinished,
    playerSide,
    position,
  ]);

  useEffect(() => {
    if (!isMatchFinished || history.length === 0) {
      achievementPositionRef.current = null;
      return;
    }

    const pgn = getPgn();

    if (!pgn || achievementPositionRef.current === pgn) {
      return;
    }

    achievementPositionRef.current = pgn;
    const newlyUnlocked = unlockAchievements(detectChessAchievements({
      game,
      mode: gameMode,
      playerSide,
    }));
    const firstAchievement = newlyUnlocked[0];

    if (firstAchievement) {
      showRewardToast({
        kind: "success",
        title: `Достижение: ${firstAchievement.title}`,
        text: firstAchievement.description,
      });
      void triggerSuccessHaptic();
    }
  }, [
    game,
    gameMode,
    getPgn,
    history.length,
    isMatchFinished,
    playerSide,
    position,
    showRewardToast,
    unlockAchievements,
  ]);

  const boardOrientation: "black" | "white" =
    bestMoveTrainingTask.context?.side === "b" ||
    (gameMode === "bot" && playerSide === "b")
      ? "black"
      : "white";
  const isActiveBotGame = isBotFairPlayActive({
    mode: gameMode,
    started: isBotGameStarted,
    isGameOver: isMatchFinished,
  });

  const legalMoveSquares = isViewingCurrentPosition && selectedSquare
    ? game
        .moves({
          square: selectedSquare as Square,
          verbose: true,
        })
        .map((move) => move.to)
    : [];

  function isBotTurnFor({
    mode = gameMode,
    side = playerSide,
    started = isBotGameStarted,
  }: {
    mode?: GameMode;
    side?: Color;
    started?: boolean;
  } = {}) {
    return isBotTurn({
      mode,
      started,
      isGameOver: isMatchFinished,
      turn: game.turn(),
      playerSide: side,
    });
  }

  const {
    error: botTurnError,
    retry: retryBotTurn,
  } = useBotTurn({
    enabled: isBotTurnFor(),
    fen: position,
    isGameOver: isMatchFinished,
    botLevelId,
    sessionId: botSessionId,
    calculateBotMove,
    makeEngineMove,
    setIsThinking: setIsBotThinking,
  });

  const {
    handleNewGame,
    handleStartBotGame,
    handleUndoMove,
    handleModeChange,
    handlePlayerSideChange,
    handleImportFen,
    handleImportPgn,
  } = createGameLifecycleActions({
    isBotThinking,
    gameMode,
    newGame,
    undoMove,
    isBotTurn: isBotTurnFor,
    loadFen,
    loadPgn,
    setSelectedSquare,
    setIsBotThinking,
    setIsBotGameStarted,
    startBotSession,
    setLastMoveReview,
    setGameMode,
    setPlayerSide,
    clearLearningJournal,
    clearGameReview,
    resetBestMoveTraining,
    clearAnalysis,
    clearGameTermination,
  });

  useEffect(() => {
    if (!isMatchFinished || history.length === 0) {
      celebratedResultRef.current = null;
      setShowResultCelebration(false);
      return;
    }

    const pgn = getPgn();
    const resultKey = `${pgn}|${gameTermination?.result ?? "natural"}`;

    if (!pgn || celebratedResultRef.current === resultKey) {
      return;
    }

    celebratedResultRef.current = resultKey;
    setShowResultCelebration(true);
  }, [gameTermination, getPgn, history.length, isMatchFinished]);

  function handleOpenResultReview() {
    setShowResultCelebration(false);
    setActiveWorkspace("game");
  }

  function handleResultNewGame() {
    setShowResultCelebration(false);
    handleNewGame();
  }

  function isPlayerTurn() {
    if (isMatchFinished) {
      return false;
    }

    return getIsPlayerTurn({
      mode: gameMode,
      started: isBotGameStarted,
      turn: game.turn(),
      playerSide,
    });
  }

  function canSelectPiece(square: string) {
    if (!isPlayerTurn()) {
      return false;
    }

    const piece = game.get(square as Square);

    if (!piece || piece.color !== game.turn()) {
      return false;
    }

    if (gameMode === "bot" && piece.color !== playerSide) {
      return false;
    }

    return true;
  }

  function handleAnalyzePosition() {
    if (isActiveBotGame) {
      return;
    }

    resetBestMoveTraining();

    void analyzePosition({
      fen: displayedPosition,
      turn: getTurnFromFen(displayedPosition),
      isGameOver: isViewingCurrentPosition && game.isGameOver(),
    });
  }

  async function handleRunGameReview() {
    if (isBotThinking || gameReviewStatus === "running") {
      return;
    }

    await runGameReview({
      fenHistory,
      moveHistory: lastMoveHistory,
      calculatePositionAnalysis,
      reviewSide: gameMode === "bot" ? playerSide : undefined,
    });
  }

  function handleSelectReviewedPosition(item: GameReviewItem) {
    setSelectedSquare(null);
    clearAnalysis();
    resetBestMoveTraining();
    viewMove(item.positionIndex);
  }

  function handleOpenArchivedGame(archivedGame: ArchivedGame) {
    archivedPositionRef.current = archivedGame.pgn;

    if (handleImportPgn(archivedGame.pgn)) {
      setActiveWorkspace("game");
    }
  }

  async function handleStartBestMoveTraining() {
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
    prepareBestMoveTraining(trainingFen);

    const trainingAnalysis = await calculatePositionAnalysis({
      fen: trainingFen,
      isGameOver: game.isGameOver(),
      movetime: 1400,
    });

    if (!trainingAnalysis?.bestMove) {
      failBestMoveTraining(
        "Не удалось подготовить задачу из текущей позиции.",
      );
      return;
    }

    readyBestMoveTraining(trainingFen, trainingAnalysis.bestMove);
  }

  function handlePracticeMainMistake(item: GameReviewItem) {
    if (!item.bestMove || !handleImportFen(item.positionFen)) {
      showRewardToast({
        kind: "warning",
        title: "Позиция недоступна",
        text: "Не удалось открыть позицию для тренировки.",
      });
      return;
    }

    readyBestMoveTraining(item.positionFen, item.bestMove, {
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

  function handleRetryBestMoveTraining() {
    const { positionFen, bestMove, context } = bestMoveTrainingTask;

    if (!positionFen || !bestMove || !handleImportFen(positionFen)) {
      return;
    }

    readyBestMoveTraining(positionFen, bestMove, context);
  }

  function handlePieceDrop(args: {
    sourceSquare: string;
    targetSquare: string | null;
  }) {
    if (isBotThinking || !isViewingCurrentPosition || !isPlayerTurn()) {
      return false;
    }

    setSelectedSquare(null);

    const positionBeforeMove = position;
    const movingSide = getTurnFromFen(positionBeforeMove);
    const suggestedBestMove = analysis?.bestMove ?? null;
    const evaluationBeforeWhite = analysis
      ? getWhiteEvaluation(analysis, analyzedTurn)
      : null;
    const playedMove = args.sourceSquare && args.targetSquare
      ? `${args.sourceSquare}${args.targetSquare}`
      : "";
    const moveWasMade = onPieceDrop(args);

    if (moveWasMade) {
      void triggerMoveHaptic();
      const positionAfterMove = game.fen();
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

      clearGameReview();

      if (
        bestMoveTrainingTask.status === "ready" &&
        bestMoveTrainingTask.positionFen === positionBeforeMove
      ) {
        const trainingSolved = isMoveMatchingBestMove({
          playedMove,
          bestMove: bestMoveTrainingTask.bestMove,
        });

        recordTrainingAttempt(trainingSolved);
        completeBestMoveTraining(playedMove, trainingSolved);

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

        void (trainingSolved
          ? triggerSuccessHaptic()
          : triggerWarningHaptic());
      } else if (bestMoveTrainingTask.status === "ready") {
        resetBestMoveTraining();
      }

      if (matchedBestMove && bestMoveTrainingTask.status !== "ready") {
        showRewardToast({
          kind: "success",
          title: "Сильный ход",
          text: "Ты сыграл рекомендованный вариант.",
        });
      }
    }

    return moveWasMade;
  }

  function handleSquareClick(square: string) {
    if (isBotThinking || !isViewingCurrentPosition || !isPlayerTurn()) {
      setSelectedSquare(null);
      return;
    }

    if (selectedSquare && selectedSquare !== square) {
      const moveWasMade = handlePieceDrop({
        sourceSquare: selectedSquare,
        targetSquare: square,
      });

      if (moveWasMade) {
        setSelectedSquare(null);
        return;
      }
    }

    if (canSelectPiece(square)) {
      setSelectedSquare(square);
      void triggerLightHaptic();
      return;
    }

    if (selectedSquare) {
      void triggerErrorHaptic();
    }

    setSelectedSquare(null);
  }

  function handlePrivacyConsentChange(status: AdsConsentStatus) {
    updatePrivacyConsent(status);
  }

  return {
    preferences: {
      gameMode,
      playerSide,
      botLevelId,
      setBotLevelId,
      activeWorkspace,
      setActiveWorkspace,
      compactUi,
      setCompactUi,
      showAnalysisArrows,
      setShowAnalysisArrows,
      boardTheme,
      setBoardTheme,
      subscriptionTier,
      setSubscriptionTier,
      privacyConsent,
    },
    session: {
      isBotThinking,
      isBotGameStarted,
      lastMoveReview,
      selectedSquare,
      gameTermination,
      terminateBotGame,
    },
    training: {
      task: bestMoveTrainingTask,
      stats: {
        currentStreak: trainingCurrentStreak,
        bestStreak: trainingBestStreak,
        totalAttempts: trainingTotalAttempts,
        totalSuccesses: trainingTotalSuccesses,
        dailyGoal: dailyTrainingGoal,
        dailySuccesses: trainingDailySuccesses,
      },
      reset: resetBestMoveTraining,
      resetStats: resetTrainingStats,
    },
    review: {
      status: gameReviewStatus,
      items: gameReviewItems,
      progress: gameReviewProgress,
      error: gameReviewError,
      clear: clearGameReview,
    },
    journal: {
      items: learningJournalItems,
      clear: clearLearningJournal,
    },
    archive: {
      games: archivedGames,
      remove: removeArchivedGame,
      clear: clearArchivedGames,
    },
    achievements: {
      unlocked: unlockedAchievements,
    },
    engine: {
      analysis,
      analyzedTurn,
      isAnalyzing,
      error,
    },
    game: {
      instance: game,
      position,
      displayedPosition,
      history,
      status,
      displayedLastMove,
      displayedCheckSquare,
      fenHistory,
      lastMoveHistory,
      viewedMoveIndex,
      isViewingCurrentPosition,
      getFen,
      getPgn,
      viewPreviousMove,
      viewNextMove,
      viewCurrentMove,
    },
    derived: {
      isMatchFinished,
      finalResultInfo,
      showInitialBoard,
      boardOrientation,
      isActiveBotGame,
      legalMoveSquares,
    },
    platform: {
      isNativeApp,
      showAdvertisingUi,
    },
    access,
    rewardToast,
    resultCelebration: {
      visible: showResultCelebration,
      close: () => setShowResultCelebration(false),
    },
    botTurn: {
      error: botTurnError,
      retry: retryBotTurn,
    },
    actions: {
      handleNewGame,
      handleStartBotGame,
      handleUndoMove,
      handleModeChange,
      handlePlayerSideChange,
      handleImportFen,
      handleImportPgn,
      handleOpenResultReview,
      handleResultNewGame,
      handleAnalyzePosition,
      handleRunGameReview,
      handleSelectReviewedPosition,
      handleOpenArchivedGame,
      handleStartBestMoveTraining,
      handlePracticeMainMistake,
      handleRetryBestMoveTraining,
      handleRevealBestMoveHint: revealBestMoveTrainingHint,
      handlePieceDrop,
      handleSquareClick,
      handlePrivacyConsentChange,
      handleResetPrivacyConsent: resetPrivacyConsent,
    },
  };
}

export type ChessCoachController = ReturnType<typeof useChessCoachController>;

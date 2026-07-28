import { useEffect, useRef } from "react";
import { Chess, type Color, type Square } from "chess.js";
import { useChessGame } from "../hooks/useChessGame";
import { useEngineAnalysis } from "../hooks/useEngineAnalysis";
import { useAppPreferences } from "../hooks/useAppPreferences";
import {
  getTurnFromFen,
  getWhiteEvaluation,
} from "../analysis/reviewRules";
import { getFeatureAccess } from "../features/featureAccess";
import type { AdsConsentStatus } from "../features/consent";
import { isNativeMobileShell } from "../platform/mobile";
import { gameSessionRepository } from "../repositories/gameSessionRepository";
import { trackProductEvent } from "../platform/analytics/analyticsClient";
import { useRewardToast } from "../hooks/useRewardToast";
import { useGameSession } from "../hooks/useGameSession";
import {
  isBotTurn,
  isPlayerTurn as getIsPlayerTurn,
} from "../game/gameFlowRules";
import { useBotTurn } from "../hooks/useBotTurn";
import { isBotFairPlayActive } from "../game/fairPlayRules";
import { createGameLifecycleActions } from "../game/gameLifecycle";
import type { GameMode } from "../game/gameTypes";
import {
  triggerErrorHaptic,
  triggerLightHaptic,
  triggerMoveHaptic,
} from "../platform/nativeBridge";
import { useLearningFlow } from "./useLearningFlow";
import { useMatchLifecycle } from "./useMatchLifecycle";
import { useOnboardingFlow } from "../hooks/useOnboardingFlow";
import {
  buildDiagnosticProfile,
  getDiagnosticBotLevel,
  type ExperienceLevel,
  type LearningGoal,
} from "../analysis/diagnosticProfile";
import { useEntitlement } from "../hooks/useEntitlement";
import {
  addNativeBackHandler,
  addNativeDeepLinkListener,
} from "../platform/nativeEvents";
import { parseDeepLink } from "../platform/deepLinks";
import { useAiCoachReflectionJournal } from "../hooks/useAiCoachReflectionJournal";

export const INITIAL_POSITION_FEN = new Chess().fen();

export function useChessCoachController() {
  const initialDeepLinkHandled = useRef(false);
  const {
    state: onboardingState,
    startDiagnostic,
    skip: skipOnboarding,
    completeDiagnostic,
    dismissResult: dismissDiagnosticResult,
  } = useOnboardingFlow();
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
    privacyConsent,
    updatePrivacyConsent,
    resetPrivacyConsent,
  } = useAppPreferences();
  const entitlement = useEntitlement();
  const aiReflections = useAiCoachReflectionJournal();

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

  const { message: rewardToast, showRewardToast } = useRewardToast();

  const access = getFeatureAccess(entitlement.tier);
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
    calculateGameReviewAnalysis,
    clearAnalysis,
  } = useEngineAnalysis();

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

  useEffect(() => {
    gameSessionRepository.saveCurrentPgn(getPgn());
  }, [position, history.length, getPgn]);
  const isActiveBotGame = isBotFairPlayActive({
    mode: gameMode,
    started: isBotGameStarted,
    isGameOver: isMatchFinished,
  });

  useEffect(() => {
    const applyDeepLink = (rawUrl: string) => {
      const target = parseDeepLink(rawUrl);

      if (!target) {
        return;
      }

      setActiveWorkspace(target.workspace);

      if (
        target.moveIndex !== undefined &&
        !isActiveBotGame &&
        target.moveIndex < fenHistory.length
      ) {
        setSelectedSquare(null);
        clearAnalysis();
        viewMove(target.moveIndex);
      }
    };

    if (!initialDeepLinkHandled.current) {
      initialDeepLinkHandled.current = true;
      applyDeepLink(window.location.href);
    }

    return addNativeDeepLinkListener(applyDeepLink);
  }, [
    clearAnalysis,
    fenHistory.length,
    isActiveBotGame,
    setActiveWorkspace,
    setSelectedSquare,
    viewMove,
  ]);

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

  const learning = useLearningFlow({
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
  });

  const {
    handleNewGame,
    handleStartBotGame,
    handleStartConfiguredBotGame,
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
    clearLearningJournal: learning.lifecycle.clearJournal,
    clearGameReview: learning.lifecycle.clearReview,
    resetBestMoveTraining: learning.lifecycle.resetTraining,
    clearAnalysis,
    clearGameTermination,
  });

  const match = useMatchLifecycle({
    game,
    gameMode,
    playerSide,
    botLevelId,
    historyLength: history.length,
    position,
    isViewingCurrentPosition,
    gameTermination,
    getPgn,
    importPgn: handleImportPgn,
    startNewGame: handleNewGame,
    setActiveWorkspace,
    showRewardToast,
  });
  const celebrationVisible = match.result.celebrationVisible;
  const closeCelebration = match.result.closeCelebration;

  useEffect(() => addNativeBackHandler(() => {
    if (celebrationVisible) {
      closeCelebration();
      return true;
    }

    if (activeWorkspace !== null) {
      setActiveWorkspace(null);
      return true;
    }

    return onboardingState.status === "pending";
  }), [
    activeWorkspace,
    celebrationVisible,
    closeCelebration,
    onboardingState.status,
    setActiveWorkspace,
  ]);

  useEffect(() => {
    if (
      onboardingState.status === "diagnostic" &&
      match.result.isMatchFinished &&
      learning.review.status === "done"
    ) {
      const profile = buildDiagnosticProfile(
        learning.review.items,
        onboardingState.goal,
      );
      setBotLevelId(profile.recommendedBotLevel);
      completeDiagnostic(profile);
    }
  }, [
    learning.review.items,
    learning.review.status,
    match.result.isMatchFinished,
    onboardingState,
    completeDiagnostic,
    setBotLevelId,
  ]);

  function handleTrackedBotGameStart() {
    if (handleStartBotGame()) {
      trackProductEvent("game_started", {
        mode: "bot",
        playerSide,
        botLevelId,
      });
    }
  }

  function startDiagnosticGame({
    goal,
    experience,
  }: {
    goal: LearningGoal;
    experience: ExperienceLevel;
  }) {
    const level = getDiagnosticBotLevel(experience);
    setBotLevelId(level);

    if (!handleStartConfiguredBotGame("w")) {
      return;
    }

    startDiagnostic({ goal, experience });
    setActiveWorkspace("game");
    trackProductEvent("game_started", {
      mode: "bot",
      playerSide: "w",
      botLevelId: level,
      source: "diagnostic",
    });
  }

  function restartDiagnosticGame() {
    if (onboardingState.status !== "diagnostic") {
      return;
    }

    setBotLevelId(getDiagnosticBotLevel(onboardingState.experience));
    handleStartConfiguredBotGame("w");
    setActiveWorkspace("game");
  }

  function openDiagnosticReview() {
    setActiveWorkspace("game");

    if (
      onboardingState.status === "diagnostic" &&
      match.result.isMatchFinished &&
      learning.review.status !== "done"
    ) {
      void learning.actions.runGameReview();
    }
  }

  const trainingSide = learning.training.task.context?.kind === "review"
    ? learning.training.task.context.side
    : null;
  const boardOrientation: "black" | "white" =
    trainingSide === "b" ||
    (gameMode === "bot" && playerSide === "b")
      ? "black"
      : "white";

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
      learning.actions.completePlayerMove({
        playedMove,
        positionBeforeMove,
        positionAfterMove,
        movingSide,
        suggestedBestMove,
        evaluationBeforeWhite,
      });
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
    training: learning.training,
    review: learning.review,
    journal: learning.journal,
    archive: match.archive,
    achievements: match.achievements,
    onboarding: onboardingState,
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
      isMatchFinished: match.result.isMatchFinished,
      finalResultInfo: match.result.finalResultInfo,
      showInitialBoard: match.result.showInitialBoard,
      boardOrientation,
      isActiveBotGame,
      legalMoveSquares,
    },
    platform: {
      isNativeApp,
      showAdvertisingUi,
    },
    entitlement,
    access,
    rewardToast,
    aiReflections,
    resultCelebration: {
      visible: match.result.celebrationVisible,
      close: match.result.closeCelebration,
    },
    botTurn: {
      error: botTurnError,
      retry: retryBotTurn,
    },
    actions: {
      handleNewGame,
      handleStartBotGame: handleTrackedBotGameStart,
      handleUndoMove,
      handleModeChange,
      handlePlayerSideChange,
      handleImportFen,
      handleImportPgn,
      handleOpenResultReview: match.result.openReview,
      handleResultNewGame: match.result.startNewGame,
      handleAnalyzePosition: learning.actions.analyzeCurrentPosition,
      handleRunGameReview: learning.actions.runGameReview,
      handleSelectReviewedPosition: learning.actions.selectReviewedPosition,
      handleOpenArchivedGame: match.archive.open,
      handleStartBestMoveTraining: learning.actions.startBestMoveTraining,
      handleStartAiReflectionTraining: learning.actions.startAiReflectionTraining,
      handlePracticeMainMistake: learning.actions.practiceMainMistake,
      handlePracticeReviewSequence: learning.actions.practiceReviewSequence,
      handleStartDueReviewTraining: learning.actions.startDueReviewTraining,
      handleContinueReviewTraining: learning.actions.continueReviewTraining,
      handleRetryBestMoveTraining: learning.actions.retryBestMoveTraining,
      handleRevealBestMoveHint: learning.actions.revealBestMoveHint,
      handlePieceDrop,
      handleSquareClick,
      handlePrivacyConsentChange,
      handleResetPrivacyConsent: resetPrivacyConsent,
      handleStartDiagnostic: startDiagnosticGame,
      handleSkipOnboarding: skipOnboarding,
      handleRestartDiagnostic: restartDiagnosticGame,
      handleOpenDiagnosticReview: openDiagnosticReview,
      handleDismissDiagnosticResult: dismissDiagnosticResult,
    },
  };
}

export type ChessCoachController = ReturnType<typeof useChessCoachController>;

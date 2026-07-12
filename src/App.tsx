import { useEffect, useRef, useState } from "react";
import type { Color, Square } from "chess.js";
import ChessBoard from "./components/ChessBoard";
import AnalysisPanel from "./components/AnalysisPanel";
import MoveHistory from "./components/MoveHistory";
import GameControls from "./components/GameControls";
import GameModeSelector, {
  type GameMode,
} from "./components/GameModeSelector";
import PlayerSideSelector from "./components/PlayerSideSelector";
import BotLevelSelector from "./components/BotLevelSelector";
import EvaluationBar from "./components/EvaluationBar";
import MoveReviewPanel, {
  type MoveReview,
  type MoveReviewVerdict,
} from "./components/MoveReviewPanel";
import PgnPanel from "./components/PgnPanel";
import FenPanel from "./components/FenPanel";
import MaterialPanel from "./components/MaterialPanel";
import CoachPanel from "./components/CoachPanel";
import GameResultPanel from "./components/GameResultPanel";
import MoveNavigatorPanel from "./components/MoveNavigatorPanel";
import BestMoveTrainingPanel, {
  type BestMoveTrainingTask,
} from "./components/BestMoveTrainingPanel";
import LearningJournalPanel, {
  type LearningJournalItem,
} from "./components/LearningJournalPanel";
import TrainingSummaryPanel from "./components/TrainingSummaryPanel";
import OpeningPrinciplesPanel from "./components/OpeningPrinciplesPanel";
import AppSettingsPanel from "./components/AppSettingsPanel";
import AdSlot from "./components/AdSlot";
import ConsentBanner from "./components/ConsentBanner";
import CollapsibleSection from "./components/CollapsibleSection";
import WorkspaceTabs, {
  type WorkspaceId,
} from "./components/WorkspaceTabs";
import RewardToast, {
  type RewardToastMessage,
} from "./components/RewardToast";
import PremiumFeatureNotice from "./components/PremiumFeatureNotice";
import { useChessGame } from "./hooks/useChessGame";
import { useEngineAnalysis } from "./hooks/useEngineAnalysis";
import type { EngineAnalysis } from "./types/chess";
import {
  getFeatureAccess,
  type SubscriptionTier,
} from "./features/featureAccess";
import {
  createPrivacyConsent,
  parsePrivacyConsent,
  type AdsConsentStatus,
  type PrivacyConsentState,
} from "./features/consent";
import {
  getBotLevel,
  type BotLevelId,
} from "./types/bot";
import { isNativeMobileShell } from "./platform/mobile";
import {
  readStorageValue,
  writeJsonStorageValue,
  writeStorageValue,
} from "./platform/appStorage";
import {
  triggerErrorHaptic,
  triggerLightHaptic,
  triggerMoveHaptic,
  triggerSuccessHaptic,
  triggerWarningHaptic,
} from "./platform/nativeBridge";
import "./components/CoachPanel.css";
import "./components/GameResultPanel.css";
import "./components/MoveNavigatorPanel.css";
import "./components/BestMoveTrainingPanel.css";
import "./components/LearningJournalPanel.css";
import "./components/TrainingSummaryPanel.css";
import "./components/OpeningPrinciplesPanel.css";
import "./components/AppSettingsPanel.css";
import "./components/AdSlot.css";
import "./components/ConsentBanner.css";
import "./components/WorkspaceTabs.css";
import "./components/RewardToast.css";
import "./App.css";

function getTurnFromFen(fen: string): Color {
  return fen.split(" ")[1] === "b" ? "b" : "w";
}

function getWhiteEvaluation(
  analysis: EngineAnalysis,
  turn: Color,
) {
  if (analysis.mate !== null) {
    const mateForWhite =
      turn === "w" ? analysis.mate : -analysis.mate;

    return mateForWhite > 0 ? 99 : -99;
  }

  if (analysis.evaluation === null) {
    return 0;
  }

  return turn === "w"
    ? analysis.evaluation
    : -analysis.evaluation;
}

function getFullMoveNumber(fen: string) {
  const value = Number(fen.split(" ")[5]);

  return Number.isFinite(value) ? value : 1;
}

function shouldAddToLearningJournal(verdict: MoveReviewVerdict) {
  return (
    verdict === "inaccuracy" ||
    verdict === "mistake" ||
    verdict === "blunder"
  );
}

function getVerdict({
  matchedBestMove,
  evaluationLoss,
}: {
  matchedBestMove: boolean | null;
  evaluationLoss: number | null;
}): MoveReviewVerdict {
  if (matchedBestMove) {
    return "best";
  }

  if (evaluationLoss === null) {
    return "unknown";
  }

  if (evaluationLoss <= 0.2) {
    return "good";
  }

  if (evaluationLoss <= 0.6) {
    return "inaccuracy";
  }

  if (evaluationLoss <= 1.5) {
    return "mistake";
  }

  return "blunder";
}

const settingsStorageKeys = {
  gameMode: "chess-coach.game-mode",
  playerSide: "chess-coach.player-side",
  botLevelId: "chess-coach.bot-level-id",
  compactUi: "chess-coach.compact-ui",
  showAnalysisArrows: "chess-coach.show-analysis-arrows",
  subscriptionTier: "chess-coach.subscription-tier",
  privacyConsent: "chess-coach.privacy-consent",
  activeWorkspace: "chess-coach.active-workspace",
  currentPgn: "chess-coach.current-pgn",
  trainingBestStreak: "chess-coach.training-best-streak",
  trainingTotalAttempts: "chess-coach.training-total-attempts",
  trainingTotalSuccesses: "chess-coach.training-total-successes",
  trainingDailyDate: "chess-coach.training-daily-date",
  trainingDailySuccesses: "chess-coach.training-daily-successes",
};

function readStoredBoolean({
  key,
  fallback,
}: {
  key: string;
  fallback: boolean;
}) {
  const value = readStorageValue(key);

  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  return fallback;
}

function readStoredNumber({
  key,
  fallback,
}: {
  key: string;
  fallback: number;
}) {
  const value = Number(readStorageValue(key));

  return Number.isFinite(value) && value >= 0
    ? value
    : fallback;
}

function readStoredGameMode(): GameMode {
  const value = readStorageValue(
    settingsStorageKeys.gameMode,
  );

  return value === "bot" || value === "analysis"
    ? value
    : "analysis";
}

function readStoredPlayerSide(): Color {
  const value = readStorageValue(
    settingsStorageKeys.playerSide,
  );

  return value === "b" ? "b" : "w";
}

function readStoredBotLevelId(): BotLevelId {
  const value = readStorageValue(
    settingsStorageKeys.botLevelId,
  );

  if (
    value === "beginner" ||
    value === "casual" ||
    value === "club" ||
    value === "strong" ||
    value === "max"
  ) {
    return value;
  }

  return "casual";
}

function readStoredSubscriptionTier(): SubscriptionTier {
  const value = readStorageValue(
    settingsStorageKeys.subscriptionTier,
  );

  return value === "free" ? "free" : "premium";
}

function readStoredPrivacyConsent(): PrivacyConsentState {
  return parsePrivacyConsent(
    readStorageValue(
      settingsStorageKeys.privacyConsent,
    ),
  );
}

function readStoredWorkspace(): WorkspaceId {
  const value = readStorageValue(
    settingsStorageKeys.activeWorkspace,
  );

  if (value === "game" || value === "tools") {
    return value;
  }

  return "coach";
}

const dailyTrainingGoal = 5;

function getTodayStorageKey() {
  return new Date().toISOString().slice(0, 10);
}

function readStoredDailySuccesses() {
  const storedDate = readStorageValue(
    settingsStorageKeys.trainingDailyDate,
  );

  if (storedDate !== getTodayStorageKey()) {
    return 0;
  }

  return readStoredNumber({
    key: settingsStorageKeys.trainingDailySuccesses,
    fallback: 0,
  });
}

const initialTrainingTask: BestMoveTrainingTask = {
  status: "idle",
  positionFen: null,
  bestMove: null,
  playedMove: null,
  error: null,
  hintLevel: 0,
};

function App() {
  const [isBotThinking, setIsBotThinking] =
    useState(false);

  const [gameMode, setGameMode] =
    useState<GameMode>(() => readStoredGameMode());

  const [playerSide, setPlayerSide] =
    useState<Color>(() => readStoredPlayerSide());

  const [botLevelId, setBotLevelId] =
    useState<BotLevelId>(() => readStoredBotLevelId());

  const [isBotGameStarted, setIsBotGameStarted] =
    useState(false);

  const [lastMoveReview, setLastMoveReview] =
    useState<MoveReview | null>(null);

  const [selectedSquare, setSelectedSquare] =
    useState<string | null>(null);

  const [bestMoveTrainingTask, setBestMoveTrainingTask] =
    useState<BestMoveTrainingTask>(initialTrainingTask);

  const [trainingCurrentStreak, setTrainingCurrentStreak] =
    useState(0);

  const [trainingBestStreak, setTrainingBestStreak] =
    useState(() =>
      readStoredNumber({
        key: settingsStorageKeys.trainingBestStreak,
        fallback: 0,
      }),
    );

  const [trainingTotalAttempts, setTrainingTotalAttempts] =
    useState(() =>
      readStoredNumber({
        key: settingsStorageKeys.trainingTotalAttempts,
        fallback: 0,
      }),
    );

  const [trainingTotalSuccesses, setTrainingTotalSuccesses] =
    useState(() =>
      readStoredNumber({
        key: settingsStorageKeys.trainingTotalSuccesses,
        fallback: 0,
      }),
    );

  const [trainingDailySuccesses, setTrainingDailySuccesses] =
    useState(() => readStoredDailySuccesses());

  const [learningJournalItems, setLearningJournalItems] =
    useState<LearningJournalItem[]>([]);

  const [activeWorkspace, setActiveWorkspace] =
    useState<WorkspaceId>(() => readStoredWorkspace());

  const [compactUi, setCompactUi] = useState(() =>
    readStoredBoolean({
      key: settingsStorageKeys.compactUi,
      fallback: false,
    }),
  );

  const [showAnalysisArrows, setShowAnalysisArrows] =
    useState(() =>
      readStoredBoolean({
        key: settingsStorageKeys.showAnalysisArrows,
        fallback: true,
      }),
    );

  const [subscriptionTier, setSubscriptionTier] =
    useState<SubscriptionTier>(() =>
      readStoredSubscriptionTier(),
    );

  const [privacyConsent, setPrivacyConsent] =
    useState<PrivacyConsentState>(() =>
      readStoredPrivacyConsent(),
    );

  const [rewardToast, setRewardToast] =
    useState<RewardToastMessage | null>(null);

  const rewardToastTimerRef = useRef<number | null>(null);

  const access = getFeatureAccess(subscriptionTier);
  const showAdvertisingUi = isNativeMobileShell();

  useEffect(() => {
    writeStorageValue(settingsStorageKeys.gameMode, gameMode);
  }, [gameMode]);

  useEffect(() => {
    writeStorageValue(settingsStorageKeys.playerSide, playerSide);
  }, [playerSide]);

  useEffect(() => {
    writeStorageValue(settingsStorageKeys.botLevelId, botLevelId);
  }, [botLevelId]);

  useEffect(() => {
    writeStorageValue(settingsStorageKeys.compactUi, String(compactUi));
  }, [compactUi]);

  useEffect(() => {
    writeStorageValue(settingsStorageKeys.activeWorkspace, activeWorkspace);
  }, [activeWorkspace]);

  useEffect(() => {
    writeStorageValue(
      settingsStorageKeys.trainingBestStreak,
      String(trainingBestStreak),
    );
  }, [trainingBestStreak]);

  useEffect(() => {
    writeStorageValue(
      settingsStorageKeys.trainingTotalAttempts,
      String(trainingTotalAttempts),
    );
  }, [trainingTotalAttempts]);

  useEffect(() => {
    writeStorageValue(
      settingsStorageKeys.trainingTotalSuccesses,
      String(trainingTotalSuccesses),
    );
  }, [trainingTotalSuccesses]);

  useEffect(() => {
    writeStorageValue(
      settingsStorageKeys.trainingDailyDate,
      getTodayStorageKey(),
    );
    writeStorageValue(
      settingsStorageKeys.trainingDailySuccesses,
      String(trainingDailySuccesses),
    );
  }, [trainingDailySuccesses]);

  useEffect(() => {
    writeStorageValue(
      settingsStorageKeys.showAnalysisArrows,
      String(showAnalysisArrows),
    );
  }, [showAnalysisArrows]);

  useEffect(() => {
    writeStorageValue(
      settingsStorageKeys.subscriptionTier,
      subscriptionTier,
    );
  }, [subscriptionTier]);

  useEffect(() => {
    writeJsonStorageValue(
      settingsStorageKeys.privacyConsent,
      privacyConsent,
    );
  }, [privacyConsent]);

  useEffect(() => {
    return () => {
      if (rewardToastTimerRef.current !== null) {
        window.clearTimeout(rewardToastTimerRef.current);
      }
    };
  }, []);

  function showRewardToast(
    message: Omit<RewardToastMessage, "id">,
  ) {
    if (rewardToastTimerRef.current !== null) {
      window.clearTimeout(rewardToastTimerRef.current);
    }

    setRewardToast({
      ...message,
      id: Date.now(),
    });

    rewardToastTimerRef.current = window.setTimeout(() => {
      setRewardToast(null);
      rewardToastTimerRef.current = null;
    }, 4200);
  }

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

  const {
    game,
    position,
    displayedPosition,
    history,
    status,
    displayedLastMove,
    displayedCheckSquare,
    fenHistory,
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
  } = useChessGame({
    onPositionChanged: clearAnalysis,
  });


  useEffect(() => {
    writeStorageValue(settingsStorageKeys.currentPgn, getPgn());
  }, [position, history.length, getPgn]);

  const boardOrientation =
    gameMode === "bot" && playerSide === "b"
      ? "black"
      : "white";

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
    return (
      mode === "bot" &&
      started &&
      !game.isGameOver() &&
      game.turn() !== side
    );
  }

  function isPlayerTurn() {
    if (gameMode === "analysis") {
      return true;
    }

    return isBotGameStarted && game.turn() === playerSide;
  }

  function canSelectPiece(square: string) {
    if (!isPlayerTurn()) {
      return false;
    }

    const piece = game.get(square as Square);

    if (!piece) {
      return false;
    }

    if (piece.color !== game.turn()) {
      return false;
    }

    if (gameMode === "bot" && piece.color !== playerSide) {
      return false;
    }

    return true;
  }

  function handleAnalyzePosition() {
    resetBestMoveTraining();

    void analyzePosition({
      fen: displayedPosition,
      turn: getTurnFromFen(displayedPosition),
      isGameOver: isViewingCurrentPosition && game.isGameOver(),
    });
  }

  async function makeBotMove({
    mode = gameMode,
    side = playerSide,
    started = isBotGameStarted,
  }: {
    mode?: GameMode;
    side?: Color;
    started?: boolean;
  } = {}) {
    if (!isBotTurnFor({ mode, side, started })) {
      return;
    }

    setIsBotThinking(true);

    try {
      await new Promise((resolve) => {
        window.setTimeout(resolve, 500);
      });

      const botLevel = getBotLevel(botLevelId);

      const bestMove = await calculateBotMove({
        fen: game.fen(),
        isGameOver: game.isGameOver(),
        botLevel,
      });

      if (!bestMove) {
        return;
      }

      if (!isBotTurnFor({ mode, side, started })) {
        return;
      }

      makeEngineMove(bestMove);
    } finally {
      setIsBotThinking(false);
    }
  }

  function requestBotMove({
    mode = gameMode,
    side = playerSide,
    started = isBotGameStarted,
  }: {
    mode?: GameMode;
    side?: Color;
    started?: boolean;
  } = {}) {
    window.setTimeout(() => {
      void makeBotMove({ mode, side, started });
    }, 0);
  }

  function reviewMoveAfterEngineEvaluation({
    playedMove,
    matchedBestMove,
    positionBeforeMove,
    bestMove,
    positionAfterMove,
    evaluationBeforeWhite,
    movingSide,
  }: {
    playedMove: string;
    bestMove: string;
    matchedBestMove: boolean;
    positionBeforeMove: string;
    positionAfterMove: string;
    evaluationBeforeWhite: number;
    movingSide: Color;
  }) {
    void calculatePositionAnalysis({
      fen: positionAfterMove,
      isGameOver: false,
      movetime: 900,
    }).then((afterAnalysis) => {
      if (!afterAnalysis) {
        setLastMoveReview((currentReview) => {
          if (
            !currentReview ||
            currentReview.playedMove !== playedMove ||
            currentReview.positionBeforeMove !==
              positionBeforeMove
          ) {
            return currentReview;
          }

          return {
            ...currentReview,
            isEvaluating: false,
            verdict: getVerdict({
              matchedBestMove,
              evaluationLoss: null,
            }),
          };
        });

        return;
      }

      const turnAfterMove = getTurnFromFen(positionAfterMove);
      const evaluationAfterWhite = getWhiteEvaluation(
        afterAnalysis,
        turnAfterMove,
      );

      const rawLoss =
        movingSide === "w"
          ? evaluationBeforeWhite - evaluationAfterWhite
          : evaluationAfterWhite - evaluationBeforeWhite;

      const evaluationLoss = Math.max(0, rawLoss);
      const verdict = getVerdict({
        matchedBestMove,
        evaluationLoss,
      });

      if (shouldAddToLearningJournal(verdict)) {
        const journalItem: LearningJournalItem = {
          id: `${positionBeforeMove}-${playedMove}`,
          moveNumber: getFullMoveNumber(positionBeforeMove),
          side: movingSide,
          playedMove,
          bestMove,
          verdict,
          evaluationLoss,
        };

        setLearningJournalItems((items) => {
          if (items.some((item) => item.id === journalItem.id)) {
            return items;
          }

          return [journalItem, ...items].slice(0, 12);
        });
      }

      setLastMoveReview((currentReview) => {
        if (
          !currentReview ||
          currentReview.playedMove !== playedMove ||
          currentReview.positionBeforeMove !==
            positionBeforeMove
        ) {
          return currentReview;
        }

        return {
          ...currentReview,
          isEvaluating: false,
          evaluationAfterWhite,
          evaluationLoss,
          verdict,
        };
      });
    });
  }

  function resetBestMoveTraining() {
    setBestMoveTrainingTask(initialTrainingTask);
  }

  function isMoveMatchingBestMove({
    playedMove,
    bestMove,
  }: {
    playedMove: string;
    bestMove: string | null;
  }) {
    if (!bestMove) {
      return false;
    }

    return bestMove.startsWith(playedMove);
  }

  function recordTrainingAttempt(solved: boolean) {
    setTrainingTotalAttempts((value) => value + 1);

    if (!solved) {
      setTrainingCurrentStreak(0);
      return;
    }

    setTrainingTotalSuccesses((value) => value + 1);

    setTrainingDailySuccesses((currentDailySuccesses) => {
      const nextDailySuccesses = currentDailySuccesses + 1;

      if (
        currentDailySuccesses < dailyTrainingGoal &&
        nextDailySuccesses >= dailyTrainingGoal
      ) {
        showRewardToast({
          kind: "success",
          title: "Цель дня выполнена",
          text: "Пять лучших ходов найдены. Можно закончить на хорошем результате или продолжить серию.",
        });
      }

      return nextDailySuccesses;
    });

    setTrainingCurrentStreak((currentStreak) => {
      const nextStreak = currentStreak + 1;

      setTrainingBestStreak((bestStreak) =>
        Math.max(bestStreak, nextStreak),
      );

      return nextStreak;
    });
  }

  function handleResetTrainingStats() {
    setTrainingCurrentStreak(0);
    setTrainingBestStreak(0);
    setTrainingTotalAttempts(0);
    setTrainingTotalSuccesses(0);
    setTrainingDailySuccesses(0);
  }

  async function handleStartBestMoveTraining() {
    if (
      isBotThinking ||
      !isViewingCurrentPosition ||
      game.isGameOver()
    ) {
      return;
    }

    const trainingFen = position;

    setSelectedSquare(null);
    clearAnalysis();
    setBestMoveTrainingTask({
      status: "preparing",
      positionFen: trainingFen,
      bestMove: null,
      playedMove: null,
      error: null,
      hintLevel: 0,
    });

    const trainingAnalysis = await calculatePositionAnalysis({
      fen: trainingFen,
      isGameOver: game.isGameOver(),
      movetime: 1400,
    });

    if (!trainingAnalysis?.bestMove) {
      setBestMoveTrainingTask({
        status: "idle",
        positionFen: null,
        bestMove: null,
        playedMove: null,
        error: "Не удалось подготовить задачу из текущей позиции.",
        hintLevel: 0,
      });
      return;
    }

    setBestMoveTrainingTask({
      status: "ready",
      positionFen: trainingFen,
      bestMove: trainingAnalysis.bestMove,
      playedMove: null,
      error: null,
      hintLevel: 0,
    });
  }

  function handleRevealBestMoveHint() {
    setBestMoveTrainingTask((task) => {
      if (task.status !== "ready") {
        return task;
      }

      return {
        ...task,
        hintLevel: Math.min(task.hintLevel + 1, 3),
      };
    });
  }

  function handlePieceDrop(args: {
    sourceSquare: string;
    targetSquare: string | null;
  }) {
    if (isBotThinking || !isViewingCurrentPosition) {
      return false;
    }

    if (!isPlayerTurn()) {
      return false;
    }

    setSelectedSquare(null);

    const positionBeforeMove = position;
    const movingSide = getTurnFromFen(positionBeforeMove);
    const suggestedBestMove = analysis?.bestMove ?? null;
    const evaluationBeforeWhite = analysis
      ? getWhiteEvaluation(analysis, analyzedTurn)
      : null;

    const playedMove =
      args.sourceSquare && args.targetSquare
        ? `${args.sourceSquare}${args.targetSquare}`
        : "";

    const moveWasMade = onPieceDrop(args);

    if (moveWasMade) {
      void triggerMoveHaptic();

      const matchedBestMove =
        suggestedBestMove === null
          ? null
          : suggestedBestMove.startsWith(playedMove);

      const initialReview: MoveReview = {
        playedMove,
        bestMove: suggestedBestMove,
        matchedBestMove,
        positionBeforeMove,
        isEvaluating:
          suggestedBestMove !== null &&
          evaluationBeforeWhite !== null &&
          !matchedBestMove,
        evaluationBeforeWhite,
        evaluationAfterWhite: null,
        evaluationLoss: matchedBestMove ? 0 : null,
        verdict: getVerdict({
          matchedBestMove,
          evaluationLoss: matchedBestMove ? 0 : null,
        }),
      };

      setLastMoveReview(initialReview);

      if (
        bestMoveTrainingTask.status === "ready" &&
        bestMoveTrainingTask.positionFen === positionBeforeMove
      ) {
        const trainingSolved = isMoveMatchingBestMove({
          playedMove,
          bestMove: bestMoveTrainingTask.bestMove,
        });

        recordTrainingAttempt(trainingSolved);

        setBestMoveTrainingTask({
          ...bestMoveTrainingTask,
          status: trainingSolved ? "success" : "fail",
          playedMove,
        });

        if (trainingSolved) {
          showRewardToast({
            kind: "success",
            title: "Лучший ход найден",
            text: "Отлично: ты увидел идею Stockfish сам.",
          });
        } else {
          showRewardToast({
            kind: "warning",
            title: "Почти",
            text: "Сравни свой ход с лучшим и попробуй понять мотив.",
          });
        }

        void (trainingSolved
          ? triggerSuccessHaptic()
          : triggerWarningHaptic());
      } else if (bestMoveTrainingTask.status === "ready") {
        resetBestMoveTraining();
      }

      if (
        matchedBestMove &&
        bestMoveTrainingTask.status !== "ready"
      ) {
        showRewardToast({
          kind: "success",
          title: "Сильный ход",
          text: "Ты сыграл вариант, который рекомендовал движок.",
        });
      }

      if (
        suggestedBestMove !== null &&
        evaluationBeforeWhite !== null &&
        !matchedBestMove
      ) {
        reviewMoveAfterEngineEvaluation({
          playedMove,
          bestMove: suggestedBestMove,
          matchedBestMove: false,
          positionBeforeMove,
          positionAfterMove: game.fen(),
          evaluationBeforeWhite,
          movingSide,
        });
      }
    }

    if (moveWasMade && isBotTurnFor()) {
      requestBotMove();
    }

    return moveWasMade;
  }


  function handleSquareClick(square: string) {
    if (
      isBotThinking ||
      !isViewingCurrentPosition ||
      !isPlayerTurn()
    ) {
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

  function handleNewGame() {
    newGame();
    setSelectedSquare(null);
    setIsBotThinking(false);
    setIsBotGameStarted(false);
    setLastMoveReview(null);
    setLearningJournalItems([]);
    resetBestMoveTraining();
    clearAnalysis();
  }

  function handleStartBotGame() {
    if (isBotThinking || gameMode !== "bot") {
      return;
    }

    newGame();
    setSelectedSquare(null);
    setIsBotThinking(false);
    setIsBotGameStarted(true);
    setLastMoveReview(null);
    setLearningJournalItems([]);
    resetBestMoveTraining();
    clearAnalysis();

    if (playerSide === "b") {
      requestBotMove({
        mode: "bot",
        side: playerSide,
        started: true,
      });
    }
  }

  function handleUndoMove() {
    if (isBotThinking) {
      return;
    }

    setSelectedSquare(null);

    if (gameMode === "analysis") {
      undoMove();
      setIsBotThinking(false);
      setLastMoveReview(null);
      resetBestMoveTraining();
      clearAnalysis();
      return;
    }

    undoMove();

    if (isBotTurnFor()) {
      undoMove();
    }

    setIsBotThinking(false);
    setLastMoveReview(null);
    resetBestMoveTraining();
    clearAnalysis();
  }

  function handleModeChange(mode: GameMode) {
    if (isBotThinking) {
      return;
    }

    setSelectedSquare(null);
    setGameMode(mode);
    setIsBotThinking(false);
    setIsBotGameStarted(false);
    setLastMoveReview(null);
    resetBestMoveTraining();
    clearAnalysis();
  }

  function handlePlayerSideChange(side: Color) {
    if (isBotThinking) {
      return;
    }

    setSelectedSquare(null);
    setPlayerSide(side);
    setIsBotThinking(false);
    setIsBotGameStarted(false);
    setLastMoveReview(null);
    resetBestMoveTraining();
    clearAnalysis();
    newGame();
  }


  function handleImportFen(fen: string) {
    if (isBotThinking) {
      return false;
    }

    setSelectedSquare(null);

    const success = loadFen(fen);

    if (!success) {
      return false;
    }

    setGameMode("analysis");
    setIsBotThinking(false);
    setIsBotGameStarted(false);
    setLastMoveReview(null);
    setLearningJournalItems([]);
    resetBestMoveTraining();
    clearAnalysis();

    return true;
  }

  function handlePrivacyConsentChange(status: AdsConsentStatus) {
    setPrivacyConsent(createPrivacyConsent(status));
  }

  function handleResetPrivacyConsent() {
    setPrivacyConsent(createPrivacyConsent("unknown"));
  }

  function handleImportPgn(pgn: string) {
    if (isBotThinking) {
      return false;
    }

    setSelectedSquare(null);

    const success = loadPgn(pgn);

    if (!success) {
      return false;
    }

    setGameMode("analysis");
    setIsBotThinking(false);
    setIsBotGameStarted(false);
    setLastMoveReview(null);
    setLearningJournalItems([]);
    resetBestMoveTraining();
    clearAnalysis();

    return true;
  }

  return (
    <main className={compactUi ? "app compact-ui" : "app"}>
      <header className="header">
        <p className="eyebrow">
          Интерактивный тренер
        </p>

        <h1>Шахматный помощник</h1>

        <p className="subtitle">
          Игра против Stockfish и анализ позиции
        </p>
      </header>

      {showAdvertisingUi && (
        <ConsentBanner
          tier={subscriptionTier}
          consent={privacyConsent}
          onChange={handlePrivacyConsentChange}
        />
      )}

      <RewardToast message={rewardToast} />

      <section className="game-layout">
        <div className="board-panel">
          <ChessBoard
            position={displayedPosition}
            bestMove={
              bestMoveTrainingTask.status === "ready"
                ? undefined
                : analysis?.bestMove
            }
            candidateMoves={
              bestMoveTrainingTask.status === "ready"
                ? []
                : analysis?.lines
                    .slice(1, 3)
                    .map((line) => line.bestMove)
            }
            boardOrientation={boardOrientation}
            lastMove={displayedLastMove}
            selectedSquare={selectedSquare}
            legalMoveSquares={legalMoveSquares}
            checkSquare={displayedCheckSquare}
            showAnalysisArrows={showAnalysisArrows}
            onSquareClick={handleSquareClick}
            onPieceDrop={handlePieceDrop}
          />
        </div>

        <aside className="side-panel">
          <div className="status-card">
            <span className="status-label">
              Состояние партии
            </span>

            <strong>
              {isBotThinking
                ? "Бот думает…"
                : !isViewingCurrentPosition
                  ? "Просмотр позиции из истории"
                  : gameMode === "bot" && !isBotGameStarted
                    ? "Выбери сторону и нажми «Старт партии»"
                    : status}
            </strong>
          </div>

          <GameModeSelector
            mode={gameMode}
            disabled={isBotThinking}
            onChange={handleModeChange}
          />

          {gameMode === "bot" && (
            <PlayerSideSelector
              side={playerSide}
              disabled={isBotThinking}
              onChange={handlePlayerSideChange}
            />
          )}

          {gameMode === "bot" && (
            <BotLevelSelector
              levelId={botLevelId}
              disabled={isBotThinking}
              onChange={setBotLevelId}
            />
          )}

          {gameMode === "bot" && !isBotGameStarted && (
            <button
              type="button"
              className="analyze-button"
              disabled={isBotThinking}
              onClick={handleStartBotGame}
            >
              Старт партии
            </button>
          )}

          <GameControls
            canUndo={
              history.length > 0 &&
              !isBotThinking &&
              isViewingCurrentPosition
            }
            isAnalyzing={isAnalyzing || isBotThinking}
            isGameOver={game.isGameOver()}
            onNewGame={handleNewGame}
            onUndoMove={handleUndoMove}
            onAnalyze={handleAnalyzePosition}
          />

          {showAdvertisingUi && (
            <AdSlot
              tier={subscriptionTier}
              placement="sidePanel"
              consent={privacyConsent}
            />
          )}

          <WorkspaceTabs
            active={activeWorkspace}
            onChange={setActiveWorkspace}
          />

          {activeWorkspace === "coach" && (
            <section className="workspace-panel">
              <CoachPanel
                analysis={analysis}
                position={displayedPosition}
              />

              <AnalysisPanel
                analysis={analysis}
                analyzedTurn={analyzedTurn}
                position={displayedPosition}
                isAnalyzing={isAnalyzing}
                error={error}
                canShowExplanations={
                  access.canUseMoveExplanations
                }
              />

              <BestMoveTrainingPanel
                task={bestMoveTrainingTask}
                stats={{
                  currentStreak: trainingCurrentStreak,
                  bestStreak: trainingBestStreak,
                  totalAttempts: trainingTotalAttempts,
                  totalSuccesses: trainingTotalSuccesses,
                  dailyGoal: dailyTrainingGoal,
                  dailySuccesses: trainingDailySuccesses,
                }}
                canStart={
                  !isBotThinking &&
                  isViewingCurrentPosition &&
                  !game.isGameOver()
                }
                onStart={handleStartBestMoveTraining}
                onRevealHint={handleRevealBestMoveHint}
                onReset={resetBestMoveTraining}
                onResetStats={handleResetTrainingStats}
              />
            </section>
          )}

          {activeWorkspace === "game" && (
            <section className="workspace-panel">
              {access.canUseMoveReview ? (
                <MoveReviewPanel
                  review={lastMoveReview}
                  canShowExplanations={
                    access.canUseMoveExplanations
                  }
                />
              ) : (
                <PremiumFeatureNotice
                  featureKey="moveReview"
                  description="Разбор последнего хода подготовлен как премиальная функция для будущей мобильной версии."
                />
              )}

              <GameResultPanel
                game={game}
                historyLength={history.length}
                onNewGame={handleNewGame}
              />

              <EvaluationBar
                analysis={analysis}
                analyzedTurn={analyzedTurn}
              />

              <MaterialPanel fen={getFen()} />
            </section>
          )}

          {activeWorkspace === "tools" && (
            <section className="workspace-panel">
              <CollapsibleSection
                title="Дебютные принципы"
                description="Центр, развитие фигур и безопасность короля"
                storageKey="chess-coach.section.opening"
              >
                <OpeningPrinciplesPanel fen={displayedPosition} />
              </CollapsibleSection>

              <CollapsibleSection
                title="Журнал и сводка"
                description="Ошибки, точность и учебная статистика"
                storageKey="chess-coach.section.learning-journal"
              >
                <TrainingSummaryPanel
                  historyLength={history.length}
                  items={learningJournalItems}
                />

                <LearningJournalPanel
                  items={learningJournalItems}
                  onClear={() => setLearningJournalItems([])}
                />
              </CollapsibleSection>

              <CollapsibleSection
                title="История ходов"
                description="Список ходов и просмотр прошлых позиций"
                storageKey="chess-coach.section.history"
              >
                <MoveNavigatorPanel
                  currentIndex={viewedMoveIndex}
                  totalPositions={fenHistory.length}
                  isViewingCurrentPosition={
                    isViewingCurrentPosition
                  }
                  onPrevious={viewPreviousMove}
                  onNext={viewNextMove}
                  onCurrent={viewCurrentMove}
                />

                <MoveHistory history={history} />
              </CollapsibleSection>

              <CollapsibleSection
                title="PGN и FEN"
                description="Импорт, экспорт партии и загрузка позиции"
                storageKey="chess-coach.section.position-tools"
              >
                {access.canUsePgnTools ? (
                  <PgnPanel
                    pgn={getPgn()}
                    onImportPgn={handleImportPgn}
                  />
                ) : (
                  <PremiumFeatureNotice
                    featureKey="pgnTools"
                    description="PGN-инструменты временно отключены через featureAccess."
                  />
                )}

                {access.canUseFenTools ? (
                  <FenPanel
                    fen={getFen()}
                    onImportFen={handleImportFen}
                  />
                ) : (
                  <PremiumFeatureNotice
                    featureKey="fenTools"
                    description="FEN-инструменты временно отключены через featureAccess."
                  />
                )}
              </CollapsibleSection>

              <CollapsibleSection
                title="Настройки"
                description="Компактный режим и поведение подсказок"
                storageKey="chess-coach.section.settings"
              >
                <AppSettingsPanel
                  compactUi={compactUi}
                  showAnalysisArrows={showAnalysisArrows}
                  subscriptionTier={subscriptionTier}
                  privacyConsent={privacyConsent}
                  showMonetizationSettings={showAdvertisingUi}
                  onCompactUiChange={setCompactUi}
                  onShowAnalysisArrowsChange={
                    setShowAnalysisArrows
                  }
                  onSubscriptionTierChange={
                    setSubscriptionTier
                  }
                  onPrivacyConsentChange={
                    handlePrivacyConsentChange
                  }
                  onPrivacyConsentReset={
                    handleResetPrivacyConsent
                  }
                />
              </CollapsibleSection>
            </section>
          )}
        </aside>
      </section>
    </main>
  );
}

export default App;

import { useEffect, useRef } from "react";
import type { Color, Square } from "chess.js";
import ChessBoard from "./components/ChessBoard";
import AnalysisPanel from "./components/AnalysisPanel";
import MoveHistory from "./components/MoveHistory";
import GameControls from "./components/GameControls";
import GameModeSelector from "./components/GameModeSelector";
import PlayerSideSelector from "./components/PlayerSideSelector";
import BotLevelSelector from "./components/BotLevelSelector";
import EvaluationBar from "./components/EvaluationBar";
import MoveReviewPanel from "./components/MoveReviewPanel";
import PgnPanel from "./components/PgnPanel";
import FenPanel from "./components/FenPanel";
import MaterialPanel from "./components/MaterialPanel";
import CoachPanel from "./components/CoachPanel";
import GameResultPanel from "./components/GameResultPanel";
import GameArchivePanel from "./components/GameArchivePanel";
import GameReviewPanel, {
  type GameReviewItem,
} from "./components/GameReviewPanel";
import MoveNavigatorPanel from "./components/MoveNavigatorPanel";
import BestMoveTrainingPanel from "./components/BestMoveTrainingPanel";
import LearningJournalPanel from "./components/LearningJournalPanel";
import TrainingSummaryPanel from "./components/TrainingSummaryPanel";
import OpeningPrinciplesPanel from "./components/OpeningPrinciplesPanel";
import AppSettingsPanel from "./components/AppSettingsPanel";
import AdSlot from "./components/AdSlot";
import ConsentBanner from "./components/ConsentBanner";
import CollapsibleSection from "./components/CollapsibleSection";
import WorkspaceTabs from "./components/WorkspaceTabs";
import RewardToast from "./components/RewardToast";
import PremiumFeatureNotice from "./components/PremiumFeatureNotice";
import GameSessionCard from "./components/GameSessionCard";
import MoveFeedbackCard from "./components/MoveFeedbackCard";
import { useChessGame } from "./hooks/useChessGame";
import { useEngineAnalysis } from "./hooks/useEngineAnalysis";
import { useAppPreferences } from "./hooks/useAppPreferences";
import {
  getTurnFromFen,
  getWhiteEvaluation,
  isMoveMatchingBestMove,
} from "./analysis/reviewRules";
import { getFeatureAccess } from "./features/featureAccess";
import {
  type AdsConsentStatus,
} from "./features/consent";
import { isNativeMobileShell } from "./platform/mobile";
import { writeStorageValue } from "./platform/appStorage";
import { gameSessionStorageKeys } from "./platform/storageKeys";
import { useTrainingProgress } from "./hooks/useTrainingProgress";
import { useGameReview } from "./hooks/useGameReview";
import { useRewardToast } from "./hooks/useRewardToast";
import { useGameSession } from "./hooks/useGameSession";
import { isBotTurn, isPlayerTurn as getIsPlayerTurn } from "./game/gameFlowRules";
import { useLearningJournal } from "./hooks/useLearningJournal";
import { useBestMoveTraining } from "./hooks/useBestMoveTraining";
import { useBotTurn } from "./hooks/useBotTurn";
import { useMoveReview } from "./hooks/useMoveReview";
import { useGameArchive } from "./hooks/useGameArchive";
import {
  createArchivedGame,
  type ArchivedGame,
} from "./game/gameArchive";
import { getGameResultInfo } from "./game/gameResult";
import { createGameLifecycleActions } from "./game/gameLifecycle";
import type { GameMode } from "./game/gameTypes";
import {
  triggerErrorHaptic,
  triggerLightHaptic,
  triggerMoveHaptic,
  triggerSuccessHaptic,
  triggerWarningHaptic,
} from "./platform/nativeBridge";
import "./components/CoachPanel.css";
import "./components/GameResultPanel.css";
import "./components/GameReviewPanel.css";
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
import "./components/GameSessionCard.css";
import "./components/MoveFeedbackCard.css";
import "./App.css";

function App() {
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


  const { message: rewardToast, showRewardToast } = useRewardToast();

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


  useEffect(() => {
    writeStorageValue(gameSessionStorageKeys.currentPgn, getPgn());
  }, [position, history.length, getPgn]);

  useEffect(() => {
    if (!game.isGameOver() || history.length === 0) {
      archivedPositionRef.current = null;
      return;
    }

    const pgn = getPgn();

    if (!pgn || archivedPositionRef.current === pgn) {
      return;
    }

    const resultInfo = getGameResultInfo(game);
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
    gameMode,
    getPgn,
    history.length,
    playerSide,
    position,
  ]);

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
    return isBotTurn({
      mode,
      started,
      isGameOver: game.isGameOver(),
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
    isGameOver: game.isGameOver(),
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
  });

  function isPlayerTurn() {
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

  async function handleRunGameReview() {
    if (isBotThinking || gameReviewStatus === "running") {
      return;
    }

    await runGameReview({
      fenHistory,
      moveHistory: lastMoveHistory,
      calculatePositionAnalysis,
    });
  }

  function handleSelectReviewedPosition(item: GameReviewItem) {
    setSelectedSquare(null);
    clearAnalysis();
    resetBestMoveTraining();
    viewMove(item.positionIndex);
  }

  function handleResetTrainingStats() {
    resetTrainingStats();
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

  function handleRevealBestMoveHint() {
    revealBestMoveTrainingHint();
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
      const positionAfterMove = game.fen();

      const moveReview = reviewMove({
        playedMove,
        positionBeforeMove,
        positionAfterMove,
        movingSide,
        suggestedBestMove,
        evaluationBeforeWhite,
      });
      const matchedBestMove = moveReview.matchedBestMove;

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

  function handlePrivacyConsentChange(status: AdsConsentStatus) {
    updatePrivacyConsent(status);
  }

  function handleResetPrivacyConsent() {
    resetPrivacyConsent();
  }

  return (
    <main className={compactUi && isNativeApp ? "app compact-ui" : "app"}>
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

        <aside className="side-panel" id="workspace-content">
          <GameSessionCard
            stateText={isBotThinking
              ? "Бот думает…"
              : !isViewingCurrentPosition
                ? "Просмотр позиции из истории"
                : gameMode === "bot" && !isBotGameStarted
                  ? "Выбери сторону и начни партию"
                  : status}
            active={gameMode === "bot" && isBotGameStarted && isViewingCurrentPosition && !game.isGameOver()}
            turnOwner={gameMode === "bot" && isBotGameStarted && isViewingCurrentPosition && !game.isGameOver()
              ? isBotThinking || game.turn() !== playerSide ? "bot" : "player"
              : null}
            showStartAction={gameMode === "bot" && !isBotGameStarted}
            startDisabled={isBotThinking}
            onStart={handleStartBotGame}
            error={botTurnError}
            retryDisabled={isBotThinking}
            onRetry={retryBotTurn}
          />

          <MoveFeedbackCard
            review={lastMoveReview}
          />

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
                subscriptionTier={subscriptionTier}
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
              <GameReviewPanel
                status={gameReviewStatus}
                progress={gameReviewProgress}
                total={Math.min(
                  lastMoveHistory.length,
                  Math.max(0, fenHistory.length - 1),
                  24,
                )}
                items={gameReviewItems}
                error={gameReviewError}
                disabled={isBotThinking}
                onRun={handleRunGameReview}
                onClear={clearGameReview}
                onSelectPosition={handleSelectReviewedPosition}
              />

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
                  onClear={clearLearningJournal}
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
                title="Архив партий"
                description="Завершённые партии сохраняются автоматически"
                storageKey="chess-coach.section.game-archive"
              >
                <GameArchivePanel
                  games={archivedGames}
                  onOpen={handleOpenArchivedGame}
                  onRemove={removeArchivedGame}
                  onClear={clearArchivedGames}
                />
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
                  showCompactUiSetting={isNativeApp}
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

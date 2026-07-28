import { lazy, Suspense } from "react";
import ChessBoard from "../components/ChessBoard";
import AnalysisPanel from "../components/AnalysisPanel";
import GameControls from "../components/GameControls";
import GameModeSelector from "../components/GameModeSelector";
import PlayerSideSelector from "../components/PlayerSideSelector";
import BotLevelSelector from "../components/BotLevelSelector";
import CoachPanel from "../components/CoachPanel";
import GameResultCelebration from "../components/GameResultCelebration";
import BestMoveTrainingPanel from "../components/BestMoveTrainingPanel";
import AdSlot from "../components/AdSlot";
import ConsentBanner from "../components/ConsentBanner";
import CollapsibleSection from "../components/CollapsibleSection";
import WorkspaceTabs from "../components/WorkspaceTabs";
import RewardToast from "../components/RewardToast";
import GameSessionCard from "../components/GameSessionCard";
import MoveFeedbackCard from "../components/MoveFeedbackCard";
import BotFairPlayNotice from "../components/BotFairPlayNotice";
import LoadingSkeleton from "../components/LoadingSkeleton";
import NextActionCard from "../components/NextActionCard";
import { getNextAction } from "./nextAction";
import {
  INITIAL_POSITION_FEN,
  type ChessCoachController,
} from "./useChessCoachController";
import "../components/CoachPanel.css";
import "../components/GameResultCelebration.css";
import "../components/LoadingSkeleton.css";
import "../components/BestMoveTrainingPanel.css";
import "../components/AdSlot.css";
import "../components/ConsentBanner.css";
import "../components/WorkspaceTabs.css";
import "../components/RewardToast.css";
import "../components/GameSessionCard.css";
import "../components/MoveFeedbackCard.css";
import "../App.css";

const OnboardingDialog = lazy(() => import("../components/OnboardingDialog"));
const DiagnosticStatusCard = lazy(() =>
  import("../components/DiagnosticStatusCard")
);
const ReviewWorkspace = lazy(() => import("./ReviewWorkspace"));
const ToolsWorkspace = lazy(() => import("./ToolsWorkspace"));

interface ChessCoachViewProps {
  controller: ChessCoachController;
}

export default function ChessCoachView({ controller }: ChessCoachViewProps) {
  const {
    preferences,
    session,
    training,
    review,
    onboarding,
    engine,
    game,
    derived,
    platform,
    access,
    rewardToast,
    resultCelebration,
    botTurn,
    actions,
  } = controller;

  const sessionStateText = session.isBotThinking
    ? "Бот думает…"
    : session.gameTermination
      ? "Партия завершена досрочно"
      : !game.isViewingCurrentPosition
        ? "Просмотр позиции из истории"
        : preferences.gameMode === "bot" && !session.isBotGameStarted
          ? "Настрой партию и запусти её"
          : game.status;
  const mainReviewItem = review.items.find(
    (item) => item.isPlayerDecision && (
      item.verdict === "inaccuracy" ||
      item.verdict === "mistake" ||
      item.verdict === "blunder"
    ),
  );
  const nextAction = getNextAction({
    activeBotGame: derived.isActiveBotGame,
    botGameStarted: session.isBotGameStarted,
    dueReviewCount: training.repetition.due,
    gameMode: preferences.gameMode,
    hasReviewableMoves: game.history.length >= 4,
    playerSide: preferences.playerSide,
    reviewCompleted: review.status === "done",
    reviewHasMistakes: Boolean(mainReviewItem),
    trainingReady: training.task.status === "ready",
  });

  function handleNextAction() {
    if (!nextAction) {
      return;
    }

    if (nextAction.kind === "start_game") {
      actions.handleStartBotGame();
      return;
    }

    if (nextAction.kind === "open_training") {
      preferences.setActiveWorkspace("coach");
      return;
    }

    if (nextAction.kind === "review_game") {
      preferences.setActiveWorkspace("game");
      actions.handleRunGameReview();
      return;
    }

    if (nextAction.kind === "review_due") {
      actions.handleStartDueReviewTraining();
      return;
    }

    if (mainReviewItem) {
      actions.handlePracticeMainMistake(mainReviewItem);
    }
  }

  return (
    <main
      className={preferences.compactUi && platform.isNativeApp
        ? "app compact-ui"
        : "app"}
    >
      <a className="skip-link" href="#workspace-content">
        Перейти к рабочей области
      </a>

      {onboarding.status === "pending" && (
        <Suspense fallback={null}>
          <OnboardingDialog
            onStart={actions.handleStartDiagnostic}
            onSkip={actions.handleSkipOnboarding}
          />
        </Suspense>
      )}

      <header className="header">
        <p className="eyebrow">Интерактивный тренер</p>
        <h1>Шахматный помощник</h1>
        <p className="subtitle">Партии, обучение и разбор решений</p>
      </header>

      {platform.showAdvertisingUi && (
        <ConsentBanner
          tier={access.tier}
          consent={preferences.privacyConsent}
          onChange={actions.handlePrivacyConsentChange}
        />
      )}

      <RewardToast message={rewardToast} />

      {resultCelebration.visible && derived.finalResultInfo && (
        <GameResultCelebration
          result={derived.finalResultInfo}
          historyLength={game.history.length}
          onReview={actions.handleOpenResultReview}
          onNewGame={actions.handleResultNewGame}
          onClose={resultCelebration.close}
        />
      )}

      <section className="game-layout">
        <div className="board-panel">
          <ChessBoard
            position={derived.showInitialBoard
              ? INITIAL_POSITION_FEN
              : game.displayedPosition}
            bestMove={
              derived.showInitialBoard || training.task.status === "ready"
                ? undefined
                : engine.analysis?.bestMove
            }
            candidateMoves={
              derived.showInitialBoard || training.task.status === "ready"
                ? []
                : engine.analysis?.lines
                    .slice(1, 3)
                    .map((line) => line.bestMove)
            }
            boardOrientation={derived.boardOrientation}
            lastMove={derived.showInitialBoard ? null : game.displayedLastMove}
            selectedSquare={derived.showInitialBoard ? null : session.selectedSquare}
            legalMoveSquares={derived.showInitialBoard ? [] : derived.legalMoveSquares}
            checkSquare={derived.showInitialBoard ? null : game.displayedCheckSquare}
            showAnalysisArrows={preferences.showAnalysisArrows}
            boardTheme={preferences.boardTheme}
            onSquareClick={actions.handleSquareClick}
            onPieceDrop={actions.handlePieceDrop}
          />
        </div>

        <aside
          className="side-panel"
          id="workspace-content"
          tabIndex={-1}
        >
          {(onboarding.status === "diagnostic" ||
            (onboarding.status === "complete" && !onboarding.resultDismissed)) && (
            <Suspense fallback={null}>
              <DiagnosticStatusCard
                state={onboarding}
                gameStarted={session.isBotGameStarted}
                gameFinished={derived.isMatchFinished}
                halfMoves={game.history.length}
                reviewStatus={review.status}
                reviewProgress={review.progress}
                onOpenReview={actions.handleOpenDiagnosticReview}
                onRestart={actions.handleRestartDiagnostic}
                onDismissResult={actions.handleDismissDiagnosticResult}
              />
            </Suspense>
          )}
          <GameSessionCard
            stateText={sessionStateText}
            active={derived.isActiveBotGame && game.isViewingCurrentPosition}
            turnOwner={derived.isActiveBotGame && game.isViewingCurrentPosition
              ? session.isBotThinking || game.instance.turn() !== preferences.playerSide
                ? "bot"
                : "player"
              : null}
            error={botTurn.error}
            retryDisabled={session.isBotThinking}
            onRetry={botTurn.retry}
          />

          <NextActionCard action={nextAction} onAction={handleNextAction} />

          {!derived.isActiveBotGame && (
            <MoveFeedbackCard review={session.lastMoveReview} />
          )}

          {!derived.isActiveBotGame && (
            <CollapsibleSection
              title="Настройка партии"
              description="Режим, сторона и уровень бота"
              defaultOpen={preferences.gameMode === "bot" && !session.isBotGameStarted}
              persistenceId="game-setup"
            >
              <GameModeSelector
                mode={preferences.gameMode}
                disabled={session.isBotThinking}
                onChange={actions.handleModeChange}
              />

              {preferences.gameMode === "bot" && (
                <BotLevelSelector
                  levelId={preferences.botLevelId}
                  disabled={session.isBotThinking}
                  onChange={preferences.setBotLevelId}
                />
              )}

              {preferences.gameMode === "bot" && (
                <PlayerSideSelector
                  side={preferences.playerSide}
                  disabled={session.isBotThinking}
                  onChange={actions.handlePlayerSideChange}
                />
              )}

              {preferences.gameMode === "bot" && (
                <button
                  type="button"
                  className="setup-start-button"
                  disabled={session.isBotThinking}
                  onClick={actions.handleStartBotGame}
                >
                  {preferences.playerSide === "w"
                    ? "Начать за белых"
                    : "Начать за чёрных"}
                </button>
              )}
            </CollapsibleSection>
          )}

          <GameControls
            canUndo={
              game.history.length > 0 &&
              !session.isBotThinking &&
              game.isViewingCurrentPosition
            }
            isAnalyzing={engine.isAnalyzing || session.isBotThinking}
            isGameOver={derived.isMatchFinished}
            canAnalyze={preferences.gameMode === "analysis"}
            canTerminate={derived.isActiveBotGame}
            showNewGame={
              preferences.gameMode !== "bot" ||
              session.isBotGameStarted ||
              derived.isMatchFinished
            }
            onNewGame={actions.handleNewGame}
            onUndoMove={actions.handleUndoMove}
            onAnalyze={actions.handleAnalyzePosition}
            onTerminate={() => session.terminateBotGame(preferences.playerSide)}
          />

          {platform.showAdvertisingUi && !derived.isActiveBotGame && (
            <AdSlot
              tier={access.tier}
              placement="sidePanel"
              consent={preferences.privacyConsent}
            />
          )}

          <WorkspaceTabs
            active={preferences.activeWorkspace}
            onChange={preferences.setActiveWorkspace}
          />

          {preferences.activeWorkspace === "coach" && (
            <section className="workspace-panel">
              {derived.isActiveBotGame ? (
                <BotFairPlayNotice />
              ) : (
                <>
                  <CoachPanel
                    analysis={engine.analysis}
                    position={game.displayedPosition}
                    access={access}
                  />

                  <AnalysisPanel
                    analysis={engine.analysis}
                    analyzedTurn={engine.analyzedTurn}
                    position={game.displayedPosition}
                    isAnalyzing={engine.isAnalyzing}
                    error={engine.error}
                    canShowExplanations={access.canUseMoveExplanations}
                  />

                  <BestMoveTrainingPanel
                    task={training.task}
                    stats={training.stats}
                    repetition={training.repetition}
                    weeklyPlan={training.weeklyPlan}
                    canStart={
                      !session.isBotThinking &&
                      game.isViewingCurrentPosition &&
                      !game.instance.isGameOver()
                    }
                    onStart={actions.handleStartBestMoveTraining}
                    onRevealHint={actions.handleRevealBestMoveHint}
                    onReset={training.reset}
                    onRetry={actions.handleRetryBestMoveTraining}
                    onNextReviewMoment={actions.handleContinueReviewTraining}
                    onResetStats={training.resetStats}
                    onStartDueReview={actions.handleStartDueReviewTraining}
                    onClearReviewQueue={training.clearRepetition}
                  />
                </>
              )}
            </section>
          )}

          {preferences.activeWorkspace === "game" && (
            <Suspense
              fallback={(
                <section className="workspace-panel">
                  <LoadingSkeleton label="Загружаем разбор…" rows={3} />
                </section>
              )}
            >
              <ReviewWorkspace controller={controller} />
            </Suspense>
          )}

          {preferences.activeWorkspace === "tools" && (
            <Suspense
              fallback={(
                <section className="workspace-panel">
                  <LoadingSkeleton label="Загружаем инструменты…" rows={3} />
                </section>
              )}
            >
              <ToolsWorkspace controller={controller} />
            </Suspense>
          )}
        </aside>
      </section>
    </main>
  );
}

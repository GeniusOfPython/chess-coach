import { lazy, Suspense } from "react";
import ChessBoard from "../components/ChessBoard";
import AnalysisPanel from "../components/AnalysisPanel";
import MoveHistory from "../components/MoveHistory";
import GameControls from "../components/GameControls";
import GameModeSelector from "../components/GameModeSelector";
import PlayerSideSelector from "../components/PlayerSideSelector";
import BotLevelSelector from "../components/BotLevelSelector";
import EvaluationBar from "../components/EvaluationBar";
import MoveReviewPanel from "../components/MoveReviewPanel";
import PgnPanel from "../components/PgnPanel";
import FenPanel from "../components/FenPanel";
import MaterialPanel from "../components/MaterialPanel";
import CoachPanel from "../components/CoachPanel";
import GameResultPanel from "../components/GameResultPanel";
import GameResultCelebration from "../components/GameResultCelebration";
import GameArchivePanel from "../components/GameArchivePanel";
import GameReviewPanel from "../components/GameReviewPanel";
import MoveNavigatorPanel from "../components/MoveNavigatorPanel";
import BestMoveTrainingPanel from "../components/BestMoveTrainingPanel";
import LearningJournalPanel from "../components/LearningJournalPanel";
import TrainingSummaryPanel from "../components/TrainingSummaryPanel";
import OpeningPrinciplesPanel from "../components/OpeningPrinciplesPanel";
import AppSettingsPanel from "../components/AppSettingsPanel";
import AdSlot from "../components/AdSlot";
import ConsentBanner from "../components/ConsentBanner";
import CollapsibleSection from "../components/CollapsibleSection";
import WorkspaceTabs from "../components/WorkspaceTabs";
import RewardToast from "../components/RewardToast";
import PremiumFeatureNotice from "../components/PremiumFeatureNotice";
import GameSessionCard from "../components/GameSessionCard";
import MoveFeedbackCard from "../components/MoveFeedbackCard";
import BotFairPlayNotice from "../components/BotFairPlayNotice";
import ChessAchievementsPanel from "../components/ChessAchievementsPanel";
import {
  INITIAL_POSITION_FEN,
  type ChessCoachController,
} from "./useChessCoachController";
import "../components/CoachPanel.css";
import "../components/GameResultPanel.css";
import "../components/GameResultCelebration.css";
import "../components/LoadingSkeleton.css";
import "../components/GameReviewPanel.css";
import "../components/MoveNavigatorPanel.css";
import "../components/BestMoveTrainingPanel.css";
import "../components/LearningJournalPanel.css";
import "../components/TrainingSummaryPanel.css";
import "../components/OpeningPrinciplesPanel.css";
import "../components/AppSettingsPanel.css";
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
const DiagnosticProfilePanel = lazy(() =>
  import("../components/DiagnosticProfilePanel")
);

interface ChessCoachViewProps {
  controller: ChessCoachController;
}

export default function ChessCoachView({ controller }: ChessCoachViewProps) {
  const {
    preferences,
    session,
    training,
    review,
    journal,
    archive,
    achievements,
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
          tier={preferences.subscriptionTier}
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
              tier={preferences.subscriptionTier}
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
                    subscriptionTier={preferences.subscriptionTier}
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
            <section className="workspace-panel">
              <GameReviewPanel
                status={review.status}
                progress={review.progress}
                total={Math.min(
                  game.lastMoveHistory.length,
                  Math.max(0, game.fenHistory.length - 1),
                  24,
                )}
                items={review.items}
                error={review.error}
                restoredProgress={review.restoredProgress}
                cachedPositions={review.cachedPositions}
                selectedPositionIndex={game.viewedMoveIndex}
                disabled={session.isBotThinking || derived.isActiveBotGame}
                disabledMessage={derived.isActiveBotGame
                  ? "Разбор станет доступен после завершения партии."
                  : undefined}
                onRun={actions.handleRunGameReview}
                onPause={review.pause}
                onClear={review.clear}
                onSelectPosition={actions.handleSelectReviewedPosition}
                onPracticeMainMistake={actions.handlePracticeMainMistake}
                onPracticeSequence={actions.handlePracticeReviewSequence}
              />

              {preferences.gameMode === "analysis" && access.canUseMoveReview ? (
                <MoveReviewPanel
                  review={session.lastMoveReview}
                  canShowExplanations={access.canUseMoveExplanations}
                />
              ) : preferences.gameMode === "analysis" ? (
                <PremiumFeatureNotice
                  featureKey="moveReview"
                  description="Разбор последнего хода подготовлен как премиальная функция для будущей мобильной версии."
                />
              ) : null}

              <GameResultPanel
                game={game.instance}
                historyLength={game.history.length}
                onNewGame={actions.handleNewGame}
                overrideResult={session.gameTermination
                  ? derived.finalResultInfo
                  : null}
              />

              <EvaluationBar
                analysis={engine.analysis}
                analyzedTurn={engine.analyzedTurn}
              />

              <MaterialPanel fen={game.getFen()} />
            </section>
          )}

          {preferences.activeWorkspace === "tools" && (
            <section className="workspace-panel">
              <CollapsibleSection
                title="Достижения"
                description="Проверяемые шахматные события в честных партиях"
                persistenceId="achievements"
              >
                <ChessAchievementsPanel unlocked={achievements.unlocked} />
              </CollapsibleSection>

              <CollapsibleSection
                title="Дебютные принципы"
                description="Центр, развитие фигур и безопасность короля"
                persistenceId="opening"
              >
                <OpeningPrinciplesPanel fen={game.displayedPosition} />
              </CollapsibleSection>

              <CollapsibleSection
                title="Журнал и сводка"
                description="Ошибки, точность и учебная статистика"
                persistenceId="learning-journal"
              >
                {onboarding.status === "complete" && (
                  <Suspense fallback={null}>
                    <DiagnosticProfilePanel profile={onboarding.result} />
                  </Suspense>
                )}

                <TrainingSummaryPanel
                  historyLength={game.history.length}
                  items={journal.items}
                />

                <LearningJournalPanel
                  items={journal.items}
                  onClear={journal.clear}
                />
              </CollapsibleSection>

              <CollapsibleSection
                title="История ходов"
                description="Список ходов и просмотр прошлых позиций"
                persistenceId="history"
              >
                <MoveNavigatorPanel
                  currentIndex={game.viewedMoveIndex}
                  totalPositions={game.fenHistory.length}
                  isViewingCurrentPosition={game.isViewingCurrentPosition}
                  onPrevious={game.viewPreviousMove}
                  onNext={game.viewNextMove}
                  onCurrent={game.viewCurrentMove}
                />

                <MoveHistory history={game.history} />
              </CollapsibleSection>

              <CollapsibleSection
                title="Архив партий"
                description="Завершённые партии сохраняются автоматически"
                persistenceId="game-archive"
              >
                <GameArchivePanel
                  games={archive.games}
                  onOpen={actions.handleOpenArchivedGame}
                  onRemove={archive.remove}
                  onClear={archive.clear}
                />
              </CollapsibleSection>

              <CollapsibleSection
                title="PGN и FEN"
                description="Импорт, экспорт партии и загрузка позиции"
                persistenceId="position-tools"
              >
                {access.canUsePgnTools ? (
                  <PgnPanel
                    pgn={game.getPgn()}
                    onImportPgn={actions.handleImportPgn}
                  />
                ) : (
                  <PremiumFeatureNotice
                    featureKey="pgnTools"
                    description="Импорт и экспорт партий доступны в Premium."
                  />
                )}

                {access.canUseFenTools ? (
                  <FenPanel
                    fen={game.getFen()}
                    onImportFen={actions.handleImportFen}
                  />
                ) : (
                  <PremiumFeatureNotice
                    featureKey="fenTools"
                    description="Загрузка и сохранение позиций доступны в Premium."
                  />
                )}
              </CollapsibleSection>

              <CollapsibleSection
                title="Настройки"
                description="Компактный режим и поведение подсказок"
                persistenceId="settings"
              >
                <AppSettingsPanel
                  compactUi={preferences.compactUi}
                  showCompactUiSetting={platform.isNativeApp}
                  showAnalysisArrows={preferences.showAnalysisArrows}
                  boardTheme={preferences.boardTheme}
                  subscriptionTier={preferences.subscriptionTier}
                  privacyConsent={preferences.privacyConsent}
                  showMonetizationSettings={platform.showAdvertisingUi}
                  onCompactUiChange={preferences.setCompactUi}
                  onShowAnalysisArrowsChange={preferences.setShowAnalysisArrows}
                  onBoardThemeChange={preferences.setBoardTheme}
                  onSubscriptionTierChange={preferences.setSubscriptionTier}
                  onPrivacyConsentChange={actions.handlePrivacyConsentChange}
                  onPrivacyConsentReset={actions.handleResetPrivacyConsent}
                />
              </CollapsibleSection>
            </section>
          )}
        </aside>
      </section>
    </main>
  );
}

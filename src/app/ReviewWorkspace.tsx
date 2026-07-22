import EvaluationBar from "../components/EvaluationBar";
import GameResultPanel from "../components/GameResultPanel";
import GameReviewPanel from "../components/GameReviewPanel";
import MaterialPanel from "../components/MaterialPanel";
import MoveReviewPanel from "../components/MoveReviewPanel";
import PremiumFeatureNotice from "../components/PremiumFeatureNotice";
import type { ChessCoachController } from "./useChessCoachController";
import "../components/GameResultPanel.css";
import "../components/GameReviewPanel.css";

export default function ReviewWorkspace({
  controller,
}: {
  controller: ChessCoachController;
}) {
  const {
    preferences,
    session,
    review,
    engine,
    game,
    derived,
    access,
    actions,
  } = controller;

  return (
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
  );
}

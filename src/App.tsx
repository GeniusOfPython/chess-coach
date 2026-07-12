import { useEffect, useState } from "react";
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
import CollapsibleSection from "./components/CollapsibleSection";
import PremiumFeatureNotice from "./components/PremiumFeatureNotice";
import { useChessGame } from "./hooks/useChessGame";
import { useEngineAnalysis } from "./hooks/useEngineAnalysis";
import type { EngineAnalysis } from "./types/chess";
import { featureAccess } from "./features/featureAccess";
import {
  getBotLevel,
  type BotLevelId,
} from "./types/bot";
import "./components/CoachPanel.css";
import "./components/GameResultPanel.css";
import "./components/MoveNavigatorPanel.css";
import "./components/BestMoveTrainingPanel.css";
import "./components/LearningJournalPanel.css";
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
};

function readStoredGameMode(): GameMode {
  const value = window.localStorage.getItem(
    settingsStorageKeys.gameMode,
  );

  return value === "bot" || value === "analysis"
    ? value
    : "analysis";
}

function readStoredPlayerSide(): Color {
  const value = window.localStorage.getItem(
    settingsStorageKeys.playerSide,
  );

  return value === "b" ? "b" : "w";
}

function readStoredBotLevelId(): BotLevelId {
  const value = window.localStorage.getItem(
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

const initialTrainingTask: BestMoveTrainingTask = {
  status: "idle",
  positionFen: null,
  bestMove: null,
  playedMove: null,
  error: null,
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

  const [learningJournalItems, setLearningJournalItems] =
    useState<LearningJournalItem[]>([]);

  useEffect(() => {
    window.localStorage.setItem(
      settingsStorageKeys.gameMode,
      gameMode,
    );
  }, [gameMode]);

  useEffect(() => {
    window.localStorage.setItem(
      settingsStorageKeys.playerSide,
      playerSide,
    );
  }, [playerSide]);

  useEffect(() => {
    window.localStorage.setItem(
      settingsStorageKeys.botLevelId,
      botLevelId,
    );
  }, [botLevelId]);

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
      });
      return;
    }

    setBestMoveTrainingTask({
      status: "ready",
      positionFen: trainingFen,
      bestMove: trainingAnalysis.bestMove,
      playedMove: null,
      error: null,
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
        setBestMoveTrainingTask({
          ...bestMoveTrainingTask,
          status: isMoveMatchingBestMove({
            playedMove,
            bestMove: bestMoveTrainingTask.bestMove,
          })
            ? "success"
            : "fail",
          playedMove,
        });
      } else if (bestMoveTrainingTask.status === "ready") {
        resetBestMoveTraining();
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
      return;
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
    <main className="app">
      <header className="header">
        <p className="eyebrow">
          Интерактивный тренер
        </p>

        <h1>Шахматный помощник</h1>

        <p className="subtitle">
          Игра против Stockfish и анализ позиции
        </p>
      </header>

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

          <CollapsibleSection
            title="Анализ и разбор"
            description="Баланс позиции, качество последнего хода и варианты Stockfish"
            storageKey="chess-coach.section.analysis"
          >
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
                featureAccess.canUseMoveExplanations
              }
            />

            <BestMoveTrainingPanel
              task={bestMoveTrainingTask}
              canStart={
                !isBotThinking &&
                isViewingCurrentPosition &&
                !game.isGameOver()
              }
              onStart={handleStartBestMoveTraining}
              onReset={resetBestMoveTraining}
            />

            {featureAccess.canUseMoveReview ? (
              <MoveReviewPanel
                review={lastMoveReview}
                canShowExplanations={
                  featureAccess.canUseMoveExplanations
                }
              />
            ) : (
              <PremiumFeatureNotice
                featureKey="moveReview"
                description="Разбор последнего хода подготовлен как премиальная функция для будущей мобильной версии."
              />
            )}

            <LearningJournalPanel
              items={learningJournalItems}
              onClear={() => setLearningJournalItems([])}
            />

            <EvaluationBar
              analysis={analysis}
              analyzedTurn={analyzedTurn}
            />

            <GameResultPanel
              game={game}
              historyLength={history.length}
              onNewGame={handleNewGame}
            />
          </CollapsibleSection>


          <CollapsibleSection
            title="Материал"
            description="Материальный баланс и взятые фигуры"
            storageKey="chess-coach.section.material"
          >
            <MaterialPanel fen={getFen()} />
          </CollapsibleSection>

          <CollapsibleSection
            title="FEN"
            description="Копирование и загрузка отдельной позиции"
            storageKey="chess-coach.section.fen"
          >
            {featureAccess.canUseFenTools ? (
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
            title="PGN"
            description="Импорт, копирование и скачивание партии"
            storageKey="chess-coach.section.pgn"
          >
            {featureAccess.canUsePgnTools ? (
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
          </CollapsibleSection>

          <CollapsibleSection
            title="История ходов"
            description="Список ходов и просмотр прошлых позиций"
            storageKey="chess-coach.section.history"
          >
            <MoveNavigatorPanel
              currentIndex={viewedMoveIndex}
              totalPositions={fenHistory.length}
              isViewingCurrentPosition={isViewingCurrentPosition}
              onPrevious={viewPreviousMove}
              onNext={viewNextMove}
              onCurrent={viewCurrentMove}
            />

            <MoveHistory history={history} />
          </CollapsibleSection>
        </aside>
      </section>
    </main>
  );
}

export default App;

import { useState } from "react";
import type { Color } from "chess.js";
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
import CollapsibleSection from "./components/CollapsibleSection";
import { useChessGame } from "./hooks/useChessGame";
import { useEngineAnalysis } from "./hooks/useEngineAnalysis";
import type { EngineAnalysis } from "./types/chess";
import {
  getBotLevel,
  type BotLevelId,
} from "./types/bot";
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

function App() {
  const [isBotThinking, setIsBotThinking] =
    useState(false);

  const [gameMode, setGameMode] =
    useState<GameMode>("analysis");

  const [playerSide, setPlayerSide] =
    useState<Color>("w");

  const [botLevelId, setBotLevelId] =
    useState<BotLevelId>("casual");

  const [lastMoveReview, setLastMoveReview] =
    useState<MoveReview | null>(null);

  const {
    analysis,
    analyzedTurn,
    isAnalyzing,
    error,
    analyzePosition,
    calculateBestMove,
    calculatePositionAnalysis,
    clearAnalysis,
  } = useEngineAnalysis();

  const {
    game,
    position,
    history,
    status,
    onPieceDrop,
    newGame,
    undoMove,
    makeEngineMove,
    getPgn,
    loadPgn,
  } = useChessGame({
    onPositionChanged: clearAnalysis,
  });

  function isBotTurnFor({
    mode = gameMode,
    side = playerSide,
  }: {
    mode?: GameMode;
    side?: Color;
  } = {}) {
    return (
      mode === "bot" &&
      !game.isGameOver() &&
      game.turn() !== side
    );
  }

  function isPlayerTurn() {
    if (gameMode === "analysis") {
      return true;
    }

    return game.turn() === playerSide;
  }

  function handleAnalyzePosition() {
    void analyzePosition({
      fen: game.fen(),
      turn: game.turn(),
      isGameOver: game.isGameOver(),
    });
  }

  async function makeBotMove({
    mode = gameMode,
    side = playerSide,
  }: {
    mode?: GameMode;
    side?: Color;
  } = {}) {
    if (!isBotTurnFor({ mode, side })) {
      return;
    }

    setIsBotThinking(true);

    try {
      await new Promise((resolve) => {
        window.setTimeout(resolve, 500);
      });

      const botLevel = getBotLevel(botLevelId);

      const bestMove = await calculateBestMove({
        fen: game.fen(),
        isGameOver: game.isGameOver(),
        movetime: botLevel.movetime,
      });

      if (!bestMove) {
        return;
      }

      if (!isBotTurnFor({ mode, side })) {
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
  }: {
    mode?: GameMode;
    side?: Color;
  } = {}) {
    window.setTimeout(() => {
      void makeBotMove({ mode, side });
    }, 0);
  }

  function reviewMoveAfterEngineEvaluation({
    playedMove,
    bestMove,
    matchedBestMove,
    positionBeforeMove,
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

      setLastMoveReview((currentReview) => {
        if (
          !currentReview ||
          currentReview.playedMove !== playedMove ||
          currentReview.positionBeforeMove !== positionBeforeMove
        ) {
          return currentReview;
        }

        return {
          ...currentReview,
          isEvaluating: false,
          evaluationAfterWhite,
          evaluationLoss,
          verdict: getVerdict({
            matchedBestMove,
            evaluationLoss,
          }),
        };
      });
    });
  }

  function handlePieceDrop(args: {
    sourceSquare: string;
    targetSquare: string | null;
  }) {
    if (isBotThinking) {
      return false;
    }

    if (!isPlayerTurn()) {
      return false;
    }

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
        suggestedBestMove !== null &&
        evaluationBeforeWhite !== null &&
        !matchedBestMove
      ) {
        reviewMoveAfterEngineEvaluation({
          playedMove,
          bestMove: suggestedBestMove,
          matchedBestMove,
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

  function handleNewGame() {
    newGame();
    setIsBotThinking(false);
    setLastMoveReview(null);
    clearAnalysis();

    if (gameMode === "bot" && playerSide === "b") {
      requestBotMove({
        mode: gameMode,
        side: playerSide,
      });
    }
  }

  function handleUndoMove() {
    if (isBotThinking) {
      return;
    }

    if (gameMode === "analysis") {
      undoMove();
      setIsBotThinking(false);
      setLastMoveReview(null);
      clearAnalysis();
      return;
    }

    undoMove();

    if (isBotTurnFor()) {
      undoMove();
    }

    setIsBotThinking(false);
    setLastMoveReview(null);
    clearAnalysis();
  }

  function handleModeChange(mode: GameMode) {
    if (isBotThinking) {
      return;
    }

    setGameMode(mode);
    setIsBotThinking(false);
    setLastMoveReview(null);
    clearAnalysis();

    if (mode === "bot" && playerSide === "b") {
      requestBotMove({
        mode,
        side: playerSide,
      });
    }
  }

  function handlePlayerSideChange(side: Color) {
    if (isBotThinking) {
      return;
    }

    setPlayerSide(side);
    setIsBotThinking(false);
    setLastMoveReview(null);
    clearAnalysis();
    newGame();

    if (gameMode === "bot" && side === "b") {
      requestBotMove({
        mode: gameMode,
        side,
      });
    }
  }

  function handleImportPgn(pgn: string) {
    if (isBotThinking) {
      return false;
    }

    const success = loadPgn(pgn);

    if (!success) {
      return false;
    }

    setGameMode("analysis");
    setIsBotThinking(false);
    setLastMoveReview(null);
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
            position={position}
            bestMove={analysis?.bestMove}
            candidateMoves={analysis?.lines
              .slice(1, 3)
              .map((line) => line.bestMove)}
            onPieceDrop={handlePieceDrop}
          />
        </div>

        <aside className="side-panel">
          <div className="status-card">
            <span className="status-label">
              Состояние партии
            </span>

            <strong>
              {isBotThinking ? "Бот думает…" : status}
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

          <GameControls
            canUndo={history.length > 0 && !isBotThinking}
            isAnalyzing={isAnalyzing || isBotThinking}
            isGameOver={game.isGameOver()}
            onNewGame={handleNewGame}
            onUndoMove={handleUndoMove}
            onAnalyze={handleAnalyzePosition}
          />

          <CollapsibleSection
            title="Анализ и разбор"
            description="Баланс позиции, качество последнего хода и варианты Stockfish"
          >
            <EvaluationBar
              analysis={analysis}
              analyzedTurn={analyzedTurn}
            />

            <MoveReviewPanel review={lastMoveReview} />

            <AnalysisPanel
              analysis={analysis}
              analyzedTurn={analyzedTurn}
              position={position}
              isAnalyzing={isAnalyzing}
              error={error}
            />
          </CollapsibleSection>

          <CollapsibleSection
            title="PGN"
            description="Импорт, копирование и скачивание партии"
          >
            <PgnPanel
              pgn={getPgn()}
              onImportPgn={handleImportPgn}
            />
          </CollapsibleSection>

          <CollapsibleSection
            title="История ходов"
            description="Список ходов текущей партии"
          >
            <MoveHistory history={history} />
          </CollapsibleSection>
        </aside>
      </section>
    </main>
  );
}

export default App;

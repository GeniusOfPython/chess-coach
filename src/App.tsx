import { useState } from "react";
import ChessBoard from "./components/ChessBoard";
import AnalysisPanel from "./components/AnalysisPanel";
import MoveHistory from "./components/MoveHistory";
import GameControls from "./components/GameControls";
import { useChessGame } from "./hooks/useChessGame";
import { useEngineAnalysis } from "./hooks/useEngineAnalysis";
import "./App.css";

function App() {
  const [isBotThinking, setIsBotThinking] =
    useState(false);

  const {
    analysis,
    analyzedTurn,
    isAnalyzing,
    error,
    analyzePosition,
    calculateBestMove,
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
  } = useChessGame({
    onPositionChanged: clearAnalysis,
  });

  function handleAnalyzePosition() {
    void analyzePosition({
      fen: game.fen(),
      turn: game.turn(),
      isGameOver: game.isGameOver(),
    });
  }

  async function makeBotMove() {
  if (game.isGameOver()) {
    return;
  }

  if (game.turn() !== "b") {
    return;
  }

  setIsBotThinking(true);

  try {
    await new Promise((resolve) => {
      window.setTimeout(resolve, 500);
    });

    const fenForBot = game.fen();

    const bestMove = await calculateBestMove({
      fen: fenForBot,
      isGameOver: game.isGameOver(),
    });

    if (!bestMove) {
      return;
    }

    if (game.isGameOver()) {
      return;
    }

    if (game.turn() !== "b") {
      return;
    }

    makeEngineMove(bestMove);
  } finally {
    setIsBotThinking(false);
  }
}
  function handlePieceDrop(args: {
  sourceSquare: string;
  targetSquare: string | null;
}) {
  if (isBotThinking) {
    return false;
  }

  if (game.turn() !== "w") {
    return false;
  }

  const moveWasMade = onPieceDrop(args);

  if (moveWasMade) {
    window.setTimeout(() => {
      void makeBotMove();
    }, 0);
  }

  return moveWasMade;
}
  function handleNewGame() {
    newGame();
    setIsBotThinking(false);
  }

  function handleUndoMove() {
    undoMove();

    if (game.turn() === "b") {
      undoMove();
    }

    setIsBotThinking(false);
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

          <GameControls
            canUndo={history.length > 0 && !isBotThinking}
            isAnalyzing={isAnalyzing || isBotThinking}
            isGameOver={game.isGameOver()}
            onNewGame={handleNewGame}
            onUndoMove={handleUndoMove}
            onAnalyze={handleAnalyzePosition}
          />

          <AnalysisPanel
            analysis={analysis}
            analyzedTurn={analyzedTurn}
            position={position}
            isAnalyzing={isAnalyzing}
            error={error}
          />

          <MoveHistory history={history} />
        </aside>
      </section>
    </main>
  );
}

export default App;
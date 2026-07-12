import { useState } from "react";
import ChessBoard from "./components/ChessBoard";
import AnalysisPanel from "./components/AnalysisPanel";
import MoveHistory from "./components/MoveHistory";
import GameControls from "./components/GameControls";
import GameModeSelector, {
  type GameMode,
} from "./components/GameModeSelector";
import { useChessGame } from "./hooks/useChessGame";
import { useEngineAnalysis } from "./hooks/useEngineAnalysis";
import "./App.css";

function App() {
  const [isBotThinking, setIsBotThinking] = useState(false);

  const [gameMode, setGameMode] =
    useState<GameMode>("analysis");

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
    if (gameMode !== "bot") {
      return;
    }

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

      const bestMove = await calculateBestMove({
        fen: game.fen(),
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

    if (gameMode === "bot" && game.turn() !== "w") {
      return false;
    }

    const moveWasMade = onPieceDrop(args);

    if (
      moveWasMade &&
      gameMode === "bot" &&
      game.turn() === "b"
    ) {
      window.setTimeout(() => {
        void makeBotMove();
      }, 0);
    }

    return moveWasMade;
  }

  function handleNewGame() {
    newGame();
    setIsBotThinking(false);
    clearAnalysis();
  }

  function handleUndoMove() {
    if (isBotThinking) {
      return;
    }

    if (gameMode === "analysis") {
      undoMove();
      setIsBotThinking(false);
      clearAnalysis();
      return;
    }

    undoMove();

    if (game.turn() === "b") {
      undoMove();
    }

    setIsBotThinking(false);
    clearAnalysis();
  }

  function handleModeChange(mode: GameMode) {
    if (isBotThinking) {
      return;
    }

    setGameMode(mode);
    setIsBotThinking(false);
    clearAnalysis();
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

          <GameModeSelector
            mode={gameMode}
            disabled={isBotThinking}
            onChange={handleModeChange}
          />

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
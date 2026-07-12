import ChessBoard from "./components/ChessBoard";
import AnalysisPanel from "./components/AnalysisPanel";
import MoveHistory from "./components/MoveHistory";
import GameControls from "./components/GameControls";
import { useChessGame } from "./hooks/useChessGame";
import { useEngineAnalysis } from "./hooks/useEngineAnalysis";
import "./App.css";

function App() {
  const {
    analysis,
    analyzedTurn,
    isAnalyzing,
    error,
    analyzePosition,
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

  return (
    <main className="app">
      <header className="header">
        <p className="eyebrow">
          Интерактивный тренер
        </p>

        <h1>Шахматный помощник</h1>

        <p className="subtitle">
          Доска и анализ позиции Stockfish 18
        </p>
      </header>

      <section className="game-layout">
        <div className="board-panel">
          <ChessBoard
            position={position}
            bestMove={analysis?.bestMove}
            onPieceDrop={onPieceDrop}
          />
        </div>

        <aside className="side-panel">
          <div className="status-card">
            <span className="status-label">
              Состояние партии
            </span>

            <strong>{status}</strong>
          </div>

          <GameControls
            canUndo={history.length > 0}
            isAnalyzing={isAnalyzing}
            isGameOver={game.isGameOver()}
            onNewGame={newGame}
            onUndoMove={undoMove}
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
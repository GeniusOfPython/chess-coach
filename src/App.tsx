import {
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Color } from "chess.js";
import ChessBoard from "./components/ChessBoard";
import AnalysisPanel from "./components/AnalysisPanel";
import MoveHistory from "./components/MoveHistory";
import GameControls from "./components/GameControls";
import { StockfishService } from "./engine/StockfishService";
import type { EngineAnalysis } from "./types/chess";
import { useChessGame } from "./hooks/useChessGame";
import "./App.css";

function App() {
  const engine = useMemo(
    () => new StockfishService(),
    [],
  );

  const [analysis, setAnalysis] =
    useState<EngineAnalysis | null>(null);

  const [analyzedTurn, setAnalyzedTurn] =
    useState<Color>("w");

  const [isAnalyzing, setIsAnalyzing] =
    useState(false);

  const [error, setError] = useState("");

  function clearAnalysis() {
    engine.stop();
    setAnalysis(null);
    setError("");
    setIsAnalyzing(false);
  }

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

  useEffect(() => {
    return () => {
      engine.destroy();
    };
  }, [engine]);

  async function analyzePosition() {
    if (game.isGameOver()) {
      setError("Партия уже завершена");
      return;
    }

    setIsAnalyzing(true);
    setAnalysis(null);
    setError("");

    try {
      const currentTurn = game.turn();

      const result = await engine.analyze(
        game.fen(),
      );

      setAnalyzedTurn(currentTurn);
      setAnalysis(result);
    } catch (analysisError) {
      setError(
        analysisError instanceof Error
          ? analysisError.message
          : "Ошибка анализа",
      );
    } finally {
      setIsAnalyzing(false);
    }
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
            onAnalyze={analyzePosition}
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
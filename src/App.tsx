import {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Chess,
  type Color,
  type Square,
} from "chess.js";
import ChessBoard from "./components/ChessBoard";
import { StockfishService } from "./engine/StockfishService";
import type { EngineAnalysis } from "./types/chess";
import AnalysisPanel from "./components/AnalysisPanel";
import MoveHistory from "./components/MoveHistory";
import GameControls from "./components/GameControls";
import "./App.css";

function App() {
  const game = useMemo(() => new Chess(), []);
  const engine = useMemo(
    () => new StockfishService(),
    [],
  );

  const [position, setPosition] = useState(
    game.fen(),
  );
  const [history, setHistory] = useState<string[]>(
    [],
  );
  const [status, setStatus] = useState("Ход белых");

  const [analysis, setAnalysis] =
    useState<EngineAnalysis | null>(null);

  const [analyzedTurn, setAnalyzedTurn] =
    useState<Color>("w");

  const [isAnalyzing, setIsAnalyzing] =
    useState(false);

  const [error, setError] = useState("");

  useEffect(() => {
    return () => {
      engine.destroy();
    };
  }, [engine]);

  function updateStatus() {
    if (game.isCheckmate()) {
      setStatus(
        game.turn() === "w"
          ? "Мат. Победили чёрные"
          : "Мат. Победили белые",
      );
      return;
    }

    if (game.isStalemate()) {
      setStatus("Пат. Ничья");
      return;
    }

    if (game.isDraw()) {
      setStatus("Ничья");
      return;
    }

    const side =
      game.turn() === "w" ? "белых" : "чёрных";

    const check = game.inCheck() ? ". Шах" : "";

    setStatus(`Ход ${side}${check}`);
  }

  function clearAnalysis() {
    engine.stop();
    setAnalysis(null);
    setError("");
    setIsAnalyzing(false);
  }

  function onPieceDrop({
    sourceSquare,
    targetSquare,
  }: {
    sourceSquare: string;
    targetSquare: string | null;
  }) {
    if (!targetSquare) {
      return false;
    }

    try {
      const move = game.move({
        from: sourceSquare as Square,
        to: targetSquare as Square,
        promotion: "q",
      });

      if (!move) {
        return false;
      }

      setPosition(game.fen());
      setHistory(game.history());
      clearAnalysis();
      updateStatus();

      return true;
    } catch {
      return false;
    }
  }

  function newGame() {
    game.reset();
    setPosition(game.fen());
    setHistory([]);
    setStatus("Ход белых");
    clearAnalysis();
  }

  function undoMove() {
    const move = game.undo();

    if (!move) {
      return;
    }

    setPosition(game.fen());
    setHistory(game.history());
    clearAnalysis();
    updateStatus();
  }

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
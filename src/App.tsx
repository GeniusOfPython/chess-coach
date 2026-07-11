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
import {
  StockfishService,
  type EngineAnalysis,
} from "./engine/StockfishService";
import "./App.css";

function formatMove(move: string) {
  if (!move || move === "(none)") {
    return "Ход отсутствует";
  }

  const from = move.slice(0, 2);
  const to = move.slice(2, 4);
  const promotion = move.slice(4);

  if (promotion) {
    return `${from} → ${to}, превращение в ${promotion.toUpperCase()}`;
  }

  return `${from} → ${to}`;
}

function formatEvaluation(
  analysis: EngineAnalysis,
  analyzedTurn: Color,
) {
  if (analysis.mate !== null) {
    const mateForWhite =
      analyzedTurn === "w"
        ? analysis.mate
        : -analysis.mate;

    return mateForWhite > 0
      ? `Мат в пользу белых за ${Math.abs(mateForWhite)}`
      : `Мат в пользу чёрных за ${Math.abs(mateForWhite)}`;
  }

  if (analysis.evaluation === null) {
    return "Нет оценки";
  }

  const whiteEvaluation =
    analyzedTurn === "w"
      ? analysis.evaluation
      : -analysis.evaluation;

  const sign = whiteEvaluation > 0 ? "+" : "";

  return `${sign}${whiteEvaluation.toFixed(2)}`;
}

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

          <div className="controls">
            <button type="button" onClick={newGame}>
              Новая партия
            </button>

            <button
              type="button"
              className="secondary"
              onClick={undoMove}
              disabled={history.length === 0}
            >
              Отменить ход
            </button>
          </div>

          <button
            type="button"
            className="analyze-button"
            onClick={analyzePosition}
            disabled={
              isAnalyzing || game.isGameOver()
            }
          >
            {isAnalyzing
              ? "Stockfish анализирует…"
              : "Показать лучший ход"}
          </button>

          <div className="analysis-card">
            <span className="status-label">
              Анализ позиции
            </span>

            {!analysis &&
              !error &&
              !isAnalyzing && (
                <p className="empty">
                  Нажми кнопку, чтобы получить
                  подсказку.
                </p>
              )}

            {isAnalyzing && (
              <p className="empty">
                Рассчитывается лучший вариант…
              </p>
            )}

            {error && (
              <p className="error-message">{error}</p>
            )}

            {analysis && (
              <div className="analysis-result">
                <div className="analysis-row">
                  <span>Лучший ход</span>
                  <strong>
                    {formatMove(analysis.bestMove)}
                  </strong>
                </div>

                <div className="analysis-row">
                  <span>Оценка для белых</span>
                  <strong>
                    {formatEvaluation(
                      analysis,
                      analyzedTurn,
                    )}
                  </strong>
                </div>

                <div className="analysis-row">
                  <span>Глубина</span>
                  <strong>{analysis.depth}</strong>
                </div>

                <div className="variation">
                  <span>Расчётный вариант</span>

                  <p>
                    {analysis.variation
                      .slice(0, 8)
                      .map(formatMove)
                      .join(" • ")}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="history-card">
            <h2>История ходов</h2>

            {history.length === 0 ? (
              <p className="empty">
                Ходов пока нет
              </p>
            ) : (
              <ol className="moves">
                {Array.from(
                  {
                    length: Math.ceil(
                      history.length / 2,
                    ),
                  },
                  (_, index) => {
                    const whiteMove =
                      history[index * 2];
                    const blackMove =
                      history[index * 2 + 1];

                    return (
                      <li key={index}>
                        <span>{whiteMove}</span>
                        <span>{blackMove ?? "—"}</span>
                      </li>
                    );
                  },
                )}
              </ol>
            )}
          </div>
        </aside>
      </section>
    </main>
  );
}

export default App;
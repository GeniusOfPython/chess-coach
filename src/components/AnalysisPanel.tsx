import type { Color } from "chess.js";
import type { EngineAnalysis } from "../types/chess";
import { explainEngineMove } from "../utils/explainMove";

type Props = {
  analysis: EngineAnalysis | null;
  analyzedTurn: Color;
  position: string;
  isAnalyzing: boolean;
  error: string;
};

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

export default function AnalysisPanel({
  analysis,
  analyzedTurn,
  position,
  isAnalyzing,
  error,
}: Props) {
  return (
    <div className="analysis-card">
      <span className="status-label">
        Анализ позиции
      </span>

      {!analysis && !error && !isAnalyzing && (
        <p className="empty">
          Нажми кнопку, чтобы получить подсказку.
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

          <div className="explanation">
            <span>Почему этот ход</span>

            <ul>
              {explainEngineMove(
                position,
                analysis.bestMove,
              ).map((explanation) => (
                <li key={explanation}>
                  {explanation}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
import type { Color } from "chess.js";
import type {
  EngineAnalysis,
  EngineLine,
} from "../types/chess";
import { ANALYSIS_LINE_COLORS } from "../theme/analysisPalette";
import { explainEngineMove } from "../utils/explainMove";
import PremiumFeatureNotice from "./PremiumFeatureNotice";
import LoadingSkeleton from "./LoadingSkeleton";

type Props = {
  analysis: EngineAnalysis | null;
  analyzedTurn: Color;
  position: string;
  isAnalyzing: boolean;
  error: string;
  canShowExplanations?: boolean;
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

function formatEvaluationValue(
  evaluation: number | null,
  mate: number | null,
  analyzedTurn: Color,
) {
  if (mate !== null) {
    const mateForWhite =
      analyzedTurn === "w" ? mate : -mate;

    return mateForWhite > 0
      ? `Мат за ${Math.abs(mateForWhite)} в пользу белых`
      : `Мат за ${Math.abs(mateForWhite)} в пользу чёрных`;
  }

  if (evaluation === null) {
    return "Нет оценки";
  }

  const whiteEvaluation =
    analyzedTurn === "w" ? evaluation : -evaluation;

  const sign = whiteEvaluation > 0 ? "+" : "";

  return `${sign}${whiteEvaluation.toFixed(2)}`;
}

function formatLineEvaluation(
  line: EngineLine,
  analyzedTurn: Color,
) {
  return formatEvaluationValue(
    line.evaluation,
    line.mate,
    analyzedTurn,
  );
}

export default function AnalysisPanel({
  analysis,
  analyzedTurn,
  position,
  isAnalyzing,
  error,
  canShowExplanations = true,
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
        <LoadingSkeleton label="Рассчитывается лучший вариант…" rows={3} />
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
              {formatEvaluationValue(
                analysis.evaluation,
                analysis.mate,
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

          <div className="engine-lines">
            <span>Лучшие варианты</span>

            <div className="engine-lines-list">
              {analysis.lines.slice(0, 3).map((line, index) => (
                <div
                  className={
                    index === 0
                      ? "engine-line primary"
                      : "engine-line"
                  }
                  key={`${index}-${line.bestMove}`}
                >
                  <strong>
                    <span
                      style={{
                        color:
                          ANALYSIS_LINE_COLORS[index] ??
                          ANALYSIS_LINE_COLORS[0],
                        fontSize: "18px",
                        lineHeight: 1,
                        marginRight: "8px",
                      }}
                    >
                      ●
                    </span>
                    {index + 1}. {formatMove(line.bestMove)}
                  </strong>

                  <span className="engine-line-evaluation">
                    {formatLineEvaluation(
                      line,
                      analyzedTurn,
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {canShowExplanations ? (
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
          ) : (
            <PremiumFeatureNotice
              featureKey="moveExplanations"
              description="Подробные объяснения и персональные рекомендации доступны в Premium."
            />
          )}
        </div>
      )}
    </div>
  );
}

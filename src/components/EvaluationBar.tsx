import type { Color } from "chess.js";
import type { EngineAnalysis } from "../types/chess";

type Props = {
  analysis: EngineAnalysis | null;
  analyzedTurn: Color;
};

function getWhiteEvaluation(
  analysis: EngineAnalysis,
  analyzedTurn: Color,
) {
  if (analysis.evaluation === null) {
    return 0;
  }

  return analyzedTurn === "w"
    ? analysis.evaluation
    : -analysis.evaluation;
}

function getWhitePercentage(
  analysis: EngineAnalysis,
  analyzedTurn: Color,
) {
  if (analysis.mate !== null) {
    const mateForWhite =
      analyzedTurn === "w"
        ? analysis.mate
        : -analysis.mate;

    return mateForWhite > 0 ? 100 : 0;
  }

  const whiteEvaluation = getWhiteEvaluation(
    analysis,
    analyzedTurn,
  );

  const clamped = Math.max(
    -6,
    Math.min(6, whiteEvaluation),
  );

  return 50 + (clamped / 6) * 50;
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
      ? `M${Math.abs(mateForWhite)}`
      : `-M${Math.abs(mateForWhite)}`;
  }

  if (analysis.evaluation === null) {
    return "0.00";
  }

  const whiteEvaluation = getWhiteEvaluation(
    analysis,
    analyzedTurn,
  );

  const sign = whiteEvaluation > 0 ? "+" : "";

  return `${sign}${whiteEvaluation.toFixed(2)}`;
}

export default function EvaluationBar({
  analysis,
  analyzedTurn,
}: Props) {
  const whitePercentage = analysis
    ? getWhitePercentage(analysis, analyzedTurn)
    : 50;

  const label = analysis
    ? formatEvaluation(analysis, analyzedTurn)
    : "0.00";

  return (
    <div className="evaluation-card">
      <span className="status-label">Баланс позиции</span>

      <div className="evaluation-horizontal">
        <div className="evaluation-scale">
          <div
            className="evaluation-black-part"
            style={{
              width: `${100 - whitePercentage}%`,
            }}
          />

          <div
            className="evaluation-white-part"
            style={{
              width: `${whitePercentage}%`,
            }}
          />

          <div className="evaluation-center-line" />

          <div className="evaluation-label">
            {label}
          </div>
        </div>

        <p className="evaluation-description">
          {whitePercentage > 58
            ? "Преимущество белых"
            : whitePercentage < 42
              ? "Преимущество чёрных"
              : "Примерно равная позиция"}
        </p>
      </div>
    </div>
  );
}

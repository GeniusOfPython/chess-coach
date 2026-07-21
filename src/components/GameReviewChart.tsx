import type { CSSProperties } from "react";
import type { GameReviewItem } from "../analysis/gameReview";
import type { TurningPoint } from "../analysis/reviewTimeline";

type Props = {
  items: GameReviewItem[];
  turningPoints: TurningPoint[];
  selectedPositionIndex: number;
  onSelectPosition: (item: GameReviewItem) => void;
};

type ChartPoint = {
  positionIndex: number;
  evaluation: number;
};

const width = 800;
const height = 240;
const horizontalPadding = 30;
const verticalPadding = 18;
const evaluationLimit = 5;

function clampEvaluation(value: number) {
  return Math.max(-evaluationLimit, Math.min(evaluationLimit, value));
}

function getX(positionIndex: number, maxPositionIndex: number) {
  const availableWidth = width - horizontalPadding * 2;
  return horizontalPadding +
    (positionIndex / Math.max(1, maxPositionIndex)) * availableWidth;
}

function getY(evaluation: number) {
  const availableHeight = height - verticalPadding * 2;
  return verticalPadding +
    ((evaluationLimit - clampEvaluation(evaluation)) /
      (evaluationLimit * 2)) * availableHeight;
}

function buildChartPoints(items: GameReviewItem[]): ChartPoint[] {
  const firstItem = items[0];

  if (!firstItem) {
    return [];
  }

  return [
    {
      positionIndex: firstItem.positionIndex,
      evaluation: firstItem.evaluationBeforeWhite,
    },
    ...items.flatMap((item) => item.evaluationAfterWhite === null
      ? []
      : [{
          positionIndex: item.positionIndex + 1,
          evaluation: item.evaluationAfterWhite,
        }]),
  ];
}

function getMarkerStyle(
  item: GameReviewItem,
  maxPositionIndex: number,
): CSSProperties {
  return {
    left: `${(getX(item.positionIndex + 1, maxPositionIndex) / width) * 100}%`,
    top: `${(getY(item.evaluationAfterWhite ?? item.evaluationBeforeWhite) / height) * 100}%`,
  };
}

export default function GameReviewChart({
  items,
  turningPoints,
  selectedPositionIndex,
  onSelectPosition,
}: Props) {
  const points = buildChartPoints(items);
  const maxPositionIndex = Math.max(
    1,
    ...points.map((point) => point.positionIndex),
  );
  const line = points
    .map((point) =>
      `${getX(point.positionIndex, maxPositionIndex)},${getY(point.evaluation)}`,
    )
    .join(" ");

  if (points.length < 2) {
    return null;
  }

  return (
    <section className="review-chart" aria-labelledby="review-chart-title">
      <div className="review-chart-heading">
        <div>
          <span className="status-label">Ход партии</span>
          <strong id="review-chart-title">Как менялся баланс позиции</strong>
        </div>
        <span className="review-chart-hint">Нажми на номер момента</span>
      </div>

      <div className="review-chart-canvas">
        <svg
          className="review-chart-svg"
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="review-line-gradient" x1="0" x2="1">
              <stop offset="0" stopColor="#00e5ff" />
              <stop offset="0.5" stopColor="#d946ef" />
              <stop offset="1" stopColor="#ff8a3d" />
            </linearGradient>
          </defs>
          <rect className="review-chart-white-zone" width={width} height={height / 2} />
          <rect className="review-chart-black-zone" y={height / 2} width={width} height={height / 2} />
          <line
            className="review-chart-center"
            x1={horizontalPadding}
            x2={width - horizontalPadding}
            y1={height / 2}
            y2={height / 2}
          />
          <polyline className="review-chart-line-shadow" points={line} />
          <polyline className="review-chart-line" points={line} />
        </svg>

        <span className="review-chart-side review-chart-side-white">Белые</span>
        <span className="review-chart-side review-chart-side-black">Чёрные</span>

        {turningPoints.map(({ item }, index) => (
          <button
            type="button"
            key={item.id}
            className={`review-chart-marker ${item.verdict}${
              selectedPositionIndex === item.positionIndex ? " active" : ""
            }`}
            style={getMarkerStyle(item, maxPositionIndex)}
            title={`Момент ${index + 1}: ход ${item.moveNumber}`}
            aria-label={`Открыть переломный момент ${index + 1}, ход ${item.moveNumber}`}
            onClick={() => onSelectPosition(item)}
          >
            {index + 1}
          </button>
        ))}
      </div>

      <div className="review-chart-legend" aria-hidden="true">
        <span>Преимущество белых</span>
        <i />
        <span>Преимущество чёрных</span>
      </div>
    </section>
  );
}

import type { Color } from "chess.js";
import type { MoveReviewVerdict } from "./MoveReviewPanel";
import LoadingSkeleton from "./LoadingSkeleton";

export type GameReviewStatus =
  | "idle"
  | "running"
  | "done"
  | "error";

export type GameReviewItem = {
  id: string;
  positionIndex: number;
  moveNumber: number;
  side: Color;
  playedMove: string;
  bestMove: string | null;
  verdict: MoveReviewVerdict;
  evaluationLoss: number | null;
};

type Props = {
  status: GameReviewStatus;
  progress: number;
  total: number;
  items: GameReviewItem[];
  error: string;
  disabled?: boolean;
  disabledMessage?: string;
  onRun: () => void;
  onClear: () => void;
  onSelectPosition: (item: GameReviewItem) => void;
};

const verdictLabels: Record<MoveReviewVerdict, string> = {
  best: "Лучший ход",
  good: "Хороший ход",
  inaccuracy: "Неточность",
  mistake: "Ошибка",
  blunder: "Грубая ошибка",
  unknown: "Без оценки",
};

function formatMove(move: string | null) {
  if (!move || move === "(none)") {
    return "—";
  }

  const from = move.slice(0, 2);
  const to = move.slice(2, 4);
  const promotion = move.slice(4);

  return promotion
    ? `${from} → ${to}=${promotion.toUpperCase()}`
    : `${from} → ${to}`;
}

function formatLoss(loss: number | null) {
  if (loss === null) {
    return "—";
  }

  return loss.toFixed(2);
}

function getSideLabel(side: Color) {
  return side === "w" ? "Белые" : "Чёрные";
}

function getCount(items: GameReviewItem[], verdict: MoveReviewVerdict) {
  return items.filter((item) => item.verdict === verdict).length;
}

export default function GameReviewPanel({
  status,
  progress,
  total,
  items,
  error,
  disabled = false,
  disabledMessage,
  onRun,
  onClear,
  onSelectPosition,
}: Props) {
  const mistakes = getCount(items, "mistake");
  const blunders = getCount(items, "blunder");
  const inaccuracies = getCount(items, "inaccuracy");
  const keyMoments = items.filter(
    (item) =>
      item.verdict === "inaccuracy" ||
      item.verdict === "mistake" ||
      item.verdict === "blunder",
  );

  const progressPercent = total > 0
    ? Math.min(100, Math.round((progress / total) * 100))
    : 0;

  return (
    <div className="game-review-card">
      <div className="game-review-header">
        <div>
          <span className="status-label">Обзор партии</span>
          <p>
            Быстрый разбор партии: находит ключевые ошибки и
            показывает более сильные продолжения.
          </p>
        </div>

        <button
          type="button"
          className="secondary compact-action"
          disabled={disabled || status === "running" || total === 0}
          onClick={onRun}
        >
          {status === "running" ? "Идёт обзор…" : "Разобрать"}
        </button>
      </div>

      {total === 0 && (
        <p className="game-review-empty">
          Сделай несколько ходов, чтобы появился материал для обзора.
        </p>
      )}

      {disabled && disabledMessage && (
        <p className="game-review-empty">{disabledMessage}</p>
      )}

      {status === "running" && (
        <div className="game-review-progress">
          <div className="game-review-progress-row">
            <span>Анализ ходов</span>
            <strong>
              {progress} / {total}
            </strong>
          </div>

          <div className="game-review-progress-track">
            <div
              className="game-review-progress-fill"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <LoadingSkeleton label="Ищем переломные моменты…" rows={2} compact />
        </div>
      )}

      {status === "error" && (
        <p className="game-review-error">{error}</p>
      )}

      {status === "done" && (
        <div className="game-review-result">
          <div className="game-review-stats">
            <div>
              <strong>{inaccuracies}</strong>
              <span>неточностей</span>
            </div>

            <div>
              <strong>{mistakes}</strong>
              <span>ошибок</span>
            </div>

            <div>
              <strong>{blunders}</strong>
              <span>грубых</span>
            </div>
          </div>

          {keyMoments.length === 0 ? (
            <p className="game-review-empty">
              Серьёзных ошибок в просмотренных ходах не найдено.
            </p>
          ) : (
            <div className="game-review-list">
              {keyMoments.slice(0, 8).map((item) => (
                <button
                  type="button"
                  className={`game-review-item ${item.verdict}`}
                  key={item.id}
                  onClick={() => onSelectPosition(item)}
                >
                  <div className="game-review-item-top">
                    <strong>
                      {item.moveNumber}. {getSideLabel(item.side)}
                    </strong>
                    <span>{verdictLabels[item.verdict]}</span>
                  </div>

                  <div className="game-review-moves">
                    <span>Сыграно</span>
                    <b>{formatMove(item.playedMove)}</b>

                    <span>Лучше было</span>
                    <b>{formatMove(item.bestMove)}</b>

                    <span>Потеря</span>
                    <b>{formatLoss(item.evaluationLoss)}</b>
                  </div>
                  <span className="game-review-open">Показать позицию на доске</span>
                </button>
              ))}
            </div>
          )}

          <button
            type="button"
            className="secondary compact-action"
            onClick={onClear}
          >
            Очистить обзор
          </button>
        </div>
      )}
    </div>
  );
}

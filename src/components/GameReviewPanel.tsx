import type { Color } from "chess.js";
import type {
  GameReviewItem,
  GameReviewStatus,
} from "../analysis/gameReview";
import type { MoveReviewVerdict } from "../analysis/reviewTypes";
import { rankTurningPoints } from "../analysis/reviewTimeline";
import LoadingSkeleton from "./LoadingSkeleton";
import GameReviewChart from "./GameReviewChart";

export type { GameReviewItem, GameReviewStatus };

type Props = {
  status: GameReviewStatus;
  progress: number;
  total: number;
  items: GameReviewItem[];
  error: string;
  restoredProgress: boolean;
  cachedPositions: number;
  disabled?: boolean;
  disabledMessage?: string;
  selectedPositionIndex: number;
  onRun: () => void;
  onPause: () => void;
  onClear: () => void;
  onSelectPosition: (item: GameReviewItem) => void;
  onPracticeMainMistake: (item: GameReviewItem) => void;
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
  restoredProgress,
  cachedPositions,
  disabled = false,
  disabledMessage,
  selectedPositionIndex,
  onRun,
  onPause,
  onClear,
  onSelectPosition,
  onPracticeMainMistake,
}: Props) {
  const playerDecisions = items.filter((item) => item.isPlayerDecision);
  const mistakes = getCount(playerDecisions, "mistake");
  const blunders = getCount(playerDecisions, "blunder");
  const inaccuracies = getCount(playerDecisions, "inaccuracy");
  const reviewErrors = playerDecisions.filter(
    (item) =>
      item.verdict === "inaccuracy" ||
      item.verdict === "mistake" ||
      item.verdict === "blunder",
  );
  const turningPoints = rankTurningPoints(items);
  const turningPointIds = new Set(
    turningPoints.map(({ item }) => item.id),
  );
  const otherErrors = reviewErrors.filter(
    (item) => !turningPointIds.has(item.id),
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

        <div className="game-review-header-actions">
          {status === "running" ? (
            <button
              type="button"
              className="secondary compact-action game-review-stop"
              onClick={onPause}
            >
              Остановить
            </button>
          ) : (
            <button
              type="button"
              className="secondary compact-action"
              disabled={disabled || total === 0}
              onClick={onRun}
            >
              {status === "paused" ? "Продолжить" : "Разобрать"}
            </button>
          )}
        </div>
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
            <span>{restoredProgress ? "Обзор продолжен" : "Анализ ходов"}</span>
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

          <div className="game-review-progress-meta">
            <span>Прогресс сохраняется автоматически</span>
            {cachedPositions > 0 && (
              <span>Готовых оценок использовано: {cachedPositions}</span>
            )}
          </div>
        </div>
      )}

      {status === "paused" && (
        <div className="game-review-paused">
          <strong>Обзор остановлен на ходе {progress} из {total}</strong>
          <span>
            Результаты сохранены. Продолжение начнётся со следующей позиции.
          </span>
          <button
            type="button"
            className="secondary compact-action"
            onClick={onClear}
          >
            Сбросить прогресс
          </button>
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

          <GameReviewChart
            items={items}
            turningPoints={turningPoints}
            selectedPositionIndex={selectedPositionIndex}
            onSelectPosition={onSelectPosition}
          />

          {turningPoints.length === 0 ? (
            <p className="game-review-empty">
              Серьёзных ошибок в просмотренных ходах не найдено.
            </p>
          ) : (
            <section className="game-review-turning-points">
              <div className="game-review-section-heading">
                <span className="status-label">Приоритет тренировки</span>
                <strong>Ключевые переломные моменты</strong>
              </div>

              {turningPoints.map(({ item, reason }, index) => (
                <article
                  className={`game-review-turning-point ${item.verdict}${
                    index === 0 ? " primary" : ""
                  }${
                    selectedPositionIndex === item.positionIndex ? " active" : ""
                  }`}
                  key={item.id}
                >
                  <div className="game-review-primary-kicker">
                    <span>{index === 0 ? "Главный момент" : `Момент ${index + 1}`}</span>
                    <b>{verdictLabels[item.verdict]}</b>
                  </div>

                  <div className="game-review-turning-title">
                    <strong>
                      Ход {item.moveNumber} · {getSideLabel(item.side)}
                    </strong>
                    <span>{reason}</span>
                  </div>

                  <div className="game-review-moves">
                    <span>Сыграно</span>
                    <b>{formatMove(item.playedMove)}</b>

                    <span>Сильнее</span>
                    <b>{formatMove(item.bestMove)}</b>

                    <span>Потеря</span>
                    <b>{formatLoss(item.evaluationLoss)}</b>
                  </div>

                  <div className="game-review-turning-actions">
                    <button
                      type="button"
                      className="secondary"
                      onClick={() => onSelectPosition(item)}
                    >
                      Показать на доске
                    </button>
                    <button
                      type="button"
                      className="game-review-practice"
                      onClick={() => onPracticeMainMistake(item)}
                    >
                      Тренировать
                    </button>
                  </div>
                </article>
              ))}
            </section>
          )}

          {otherErrors.length > 0 && (
            <div className="game-review-list">
              <span className="status-label">Остальные ошибки</span>
              {otherErrors.slice(0, 5).map((item) => (
                <button
                  type="button"
                  className={`game-review-item ${item.verdict}${
                    selectedPositionIndex === item.positionIndex ? " active" : ""
                  }`}
                  key={item.id}
                  onClick={() => onSelectPosition(item)}
                >
                  <div className="game-review-item-top">
                    <strong>
                      Ход {item.moveNumber} · {getSideLabel(item.side)}
                    </strong>
                    <span>{verdictLabels[item.verdict]}</span>
                  </div>
                  <span className="game-review-open">
                    {formatMove(item.playedMove)} · потеря {formatLoss(item.evaluationLoss)}
                  </span>
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

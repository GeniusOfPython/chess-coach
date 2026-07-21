import type { Color } from "chess.js";
import { explainEngineMove } from "../utils/explainMove";

export type BestMoveTrainingStatus =
  | "idle"
  | "preparing"
  | "ready"
  | "success"
  | "fail";

export type BestMoveTrainingTask = {
  status: BestMoveTrainingStatus;
  positionFen: string | null;
  bestMove: string | null;
  playedMove: string | null;
  error: string | null;
  hintLevel: number;
  context: BestMoveTrainingContext | null;
};

export type BestMoveTrainingContext = {
  kind: "review";
  moveNumber: number;
  side: Color;
  playedMove: string;
  verdict: "inaccuracy" | "mistake" | "blunder";
};

export type BestMoveTrainingStats = {
  currentStreak: number;
  bestStreak: number;
  totalAttempts: number;
  totalSuccesses: number;
  dailyGoal: number;
  dailySuccesses: number;
};

type Props = {
  task: BestMoveTrainingTask;
  stats: BestMoveTrainingStats;
  canStart: boolean;
  onStart: () => void;
  onRevealHint: () => void;
  onReset: () => void;
  onRetry: () => void;
  onResetStats: () => void;
};

function formatMove(move: string | null) {
  if (!move || move === "(none)") {
    return "Нет хода";
  }

  const from = move.slice(0, 2);
  const to = move.slice(2, 4);
  const promotion = move.slice(4);

  if (promotion) {
    return `${from} → ${to}, превращение в ${promotion.toUpperCase()}`;
  }

  return `${from} → ${to}`;
}

function getPieceHint(move: string | null) {
  if (!move || move === "(none)") {
    return "Лучший ход пока не определён.";
  }

  return `Подсказка 1: начни с фигуры на поле ${move.slice(0, 2)}.`;
}

function getTargetHint(move: string | null) {
  if (!move || move === "(none)") {
    return "Лучший ход пока не определён.";
  }

  return `Подсказка 2: идея связана с полем ${move.slice(2, 4)}.`;
}

function getStatusText(task: BestMoveTrainingTask) {
  if (task.status === "preparing") {
    return "Готовим задачу…";
  }

  if (task.status === "ready") {
    return "Найди лучший ход в текущей позиции. Подсказки и стрелки скрыты.";
  }

  if (task.status === "success") {
    return "Верно. Ты нашёл сильнейшее продолжение.";
  }

  if (task.status === "fail") {
    return "Есть более сильное продолжение.";
  }

  return "Запусти тренировку, чтобы попробовать самому найти лучший ход без подсказки.";
}

function getVisibleHints(task: BestMoveTrainingTask) {
  if (task.status !== "ready") {
    return [];
  }

  const hints: string[] = [];

  if (task.hintLevel >= 1) {
    hints.push(getPieceHint(task.bestMove));
  }

  if (task.hintLevel >= 2) {
    hints.push(getTargetHint(task.bestMove));
  }

  if (task.hintLevel >= 3) {
    hints.push(`Подсказка 3: лучший ход — ${formatMove(task.bestMove)}.`);
  }

  return hints;
}

function getAccuracy(stats: BestMoveTrainingStats) {
  if (stats.totalAttempts === 0) {
    return "—";
  }

  return `${Math.round((stats.totalSuccesses / stats.totalAttempts) * 100)}%`;
}

function getDailyProgress(stats: BestMoveTrainingStats) {
  if (stats.dailyGoal <= 0) {
    return 0;
  }

  return Math.min(100, Math.round((stats.dailySuccesses / stats.dailyGoal) * 100));
}

export default function BestMoveTrainingPanel({
  task,
  stats,
  canStart,
  onStart,
  onRevealHint,
  onReset,
  onRetry,
  onResetStats,
}: Props) {
  const explanations =
    task.positionFen && task.bestMove
      ? explainEngineMove(task.positionFen, task.bestMove)
      : [];

  const visibleHints = getVisibleHints(task);
  const isReviewTask = task.context?.kind === "review";

  return (
    <div className="best-move-training-card">
      <div className="best-move-training-heading">
        <span className="status-label">
          {isReviewTask ? "Исправление главной ошибки" : "Тренировка лучшего хода"}
        </span>

        {stats.totalAttempts > 0 && (
          <button
            type="button"
            className="best-move-training-reset-stats"
            onClick={onResetStats}
          >
            Сбросить серию
          </button>
        )}
      </div>

      {task.context && (
        <div className="learning-cycle-steps" aria-label="Этапы исправления ошибки">
          <div className="complete"><span>1</span><b>Ошибка найдена</b></div>
          <div className={task.status === "success" ? "complete" : "active"}><span>2</span><b>Решение повторено</b></div>
          <div className={task.status === "success" ? "complete" : "pending"}><span>3</span><b>Навык проверен</b></div>
        </div>
      )}

      <div className="best-move-training-stats" aria-label="Статистика тренировки">
        <div>
          <span>Серия</span>
          <strong>{stats.currentStreak}</strong>
        </div>

        <div>
          <span>Рекорд</span>
          <strong>{stats.bestStreak}</strong>
        </div>

        <div>
          <span>Точность</span>
          <strong>{getAccuracy(stats)}</strong>
        </div>
      </div>

      <div className="best-move-training-daily">
        <div className="best-move-training-daily-header">
          <span>Цель дня</span>
          <strong>{Math.min(stats.dailySuccesses, stats.dailyGoal)} / {stats.dailyGoal}</strong>
        </div>

        <div className="best-move-training-daily-bar" aria-hidden="true">
          <div
            style={{
              width: `${getDailyProgress(stats)}%`,
            }}
          />
        </div>
      </div>

      <div className={`best-move-training ${task.status}`}>
        <strong>{getStatusText(task)}</strong>

        {task.context && task.status !== "success" && (
          <p className="best-move-training-origin">
            В партии на {task.context.moveNumber}-м ходу было сыграно {formatMove(task.context.playedMove)}.
            Найди ход, который исправляет эту ошибку.
          </p>
        )}

        {stats.currentStreak >= 3 && task.status !== "fail" && (
          <p className="best-move-training-streak-note">
            Хорошая серия: {stats.currentStreak} лучших ходов подряд. Продолжай без подсказок, чтобы закрепить навык.
          </p>
        )}

        {task.error && (
          <p className="best-move-training-error">
            {task.error}
          </p>
        )}

        {task.status === "ready" && (
          <>
            <p>
              Сделай ход на доске. После хода появится оценка решения и
              сравнение с лучшим продолжением.
            </p>

            {visibleHints.length > 0 && (
              <div className="best-move-training-hints">
                {visibleHints.map((hint) => (
                  <p key={hint}>{hint}</p>
                ))}
              </div>
            )}
          </>
        )}

        {task.status === "success" && (
          <>
            <div className="best-move-training-result">
              <span>Твой ход</span>
              <b>{formatMove(task.playedMove)}</b>
            </div>
            {task.context && (
              <p className="best-move-training-verified">
                Главная ошибка исправлена. Позиция решена самостоятельно, навык засчитан в прогресс.
              </p>
            )}
          </>
        )}

        {task.status === "fail" && (
          <>
            <div className="best-move-training-result">
              <span>Твой ход</span>
              <b>{formatMove(task.playedMove)}</b>

              <span>Лучший ход</span>
              <b>{formatMove(task.bestMove)}</b>
            </div>

            {explanations.length > 0 && (
              <div className="best-move-training-explanation">
                <span>Почему этот ход был сильнее</span>

                <ul>
                  {explanations.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}

        <div className="best-move-training-actions">
          {task.status === "fail" && task.context ? (
            <button
              type="button"
              className="training-retry-button"
              onClick={onRetry}
            >
              Попробовать эту позицию ещё раз
            </button>
          ) : (
            <button
              type="button"
              className="secondary"
              disabled={!canStart || task.status === "preparing"}
              onClick={onStart}
            >
              {task.status === "idle"
                ? "Начать тренировку"
                : "Новая задача из позиции"}
            </button>
          )}

          {task.status === "ready" && (
            <button
              type="button"
              className="secondary ghost"
              disabled={task.hintLevel >= 3}
              onClick={onRevealHint}
            >
              {task.hintLevel >= 3
                ? "Все подсказки открыты"
                : "Дать подсказку"}
            </button>
          )}

          {task.status !== "idle" && (
            <button
              type="button"
              className="secondary ghost"
              disabled={task.status === "preparing"}
              onClick={onReset}
            >
              Сбросить задачу
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

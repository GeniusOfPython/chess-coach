import type { Color } from "chess.js";
import { buildReviewInsight } from "../analysis/reviewInsight";
import { explainEngineMove } from "../utils/explainMove";
import type { WeeklyTrainingPlan } from "../analysis/weeklyTrainingPlan";
import type { AiReflectionTrainingContext } from "../analysis/reflectionTraining";

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

export type ReviewTrainingContext = {
  kind: "review";
  source: "game_review" | "spaced_repetition";
  repetitionId: string;
  themeLabel: string | null;
  moveNumber: number;
  side: Color;
  playedMove: string;
  verdict: "inaccuracy" | "mistake" | "blunder";
  evaluationBeforeWhite: number;
  evaluationAfterWhite: number | null;
  evaluationLoss: number | null;
  sequenceIndex: number;
  sequenceTotal: number;
};

export type BestMoveTrainingContext =
  | ReviewTrainingContext
  | AiReflectionTrainingContext;

export type BestMoveTrainingStats = {
  currentStreak: number;
  bestStreak: number;
  totalAttempts: number;
  totalSuccesses: number;
  dailyGoal: number;
  dailySuccesses: number;
};

export type RepetitionTrainingStats = {
  total: number;
  due: number;
  weakThemeLabel: string | null;
};

type Props = {
  task: BestMoveTrainingTask;
  stats: BestMoveTrainingStats;
  repetition: RepetitionTrainingStats;
  weeklyPlan: WeeklyTrainingPlan;
  canStart: boolean;
  onStart: () => void;
  onRevealHint: () => void;
  onReset: () => void;
  onRetry: () => void;
  onNextReviewMoment: () => void;
  onResetStats: () => void;
  onStartDueReview: () => void;
  onClearReviewQueue: () => void;
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
  repetition,
  weeklyPlan,
  canStart,
  onStart,
  onRevealHint,
  onReset,
  onRetry,
  onNextReviewMoment,
  onResetStats,
  onStartDueReview,
  onClearReviewQueue,
}: Props) {
  const explanations =
    task.positionFen && task.bestMove
      ? explainEngineMove(task.positionFen, task.bestMove)
      : [];

  const visibleHints = getVisibleHints(task);
  const reviewContext = task.context?.kind === "review"
    ? task.context
    : null;
  const isReviewTask = Boolean(reviewContext);
  const aiReflection = task.context?.kind === "ai_reflection"
    ? task.context
    : null;
  const reviewInsight = reviewContext && task.positionFen
    ? buildReviewInsight({
        positionFen: task.positionFen,
        side: reviewContext.side,
        playedMove: reviewContext.playedMove,
        bestMove: task.bestMove,
        evaluationBeforeWhite: reviewContext.evaluationBeforeWhite,
        evaluationAfterWhite: reviewContext.evaluationAfterWhite,
        evaluationLoss: reviewContext.evaluationLoss,
      })
    : null;
  const hasNextReviewMoment = Boolean(
    reviewContext && reviewContext.sequenceIndex < reviewContext.sequenceTotal,
  );

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

      {reviewContext && (
        <>
          {reviewContext.sequenceTotal > 1 && (
            <div className="review-training-sequence" aria-label="Прогресс тренировки переломных моментов">
              <span>Серия позиций</span>
              <strong>{reviewContext.sequenceIndex} / {reviewContext.sequenceTotal}</strong>
            </div>
          )}

          <div className="learning-cycle-steps" aria-label="Этапы исправления ошибки">
            <div className="complete"><span>1</span><b>Ошибка найдена</b></div>
            <div className={task.status === "success" ? "complete" : "active"}><span>2</span><b>Решение повторено</b></div>
            <div className={task.status === "success" ? "complete" : "pending"}><span>3</span><b>Навык проверен</b></div>
          </div>
        </>
      )}

      {aiReflection && (
        <section className="ai-reflection-training-context" aria-label="Твоя сохранённая мысль">
          <span>Твоя мысль перед проверкой</span>
          <p>{aiReflection.answer}</p>
          <small>Вопрос ИИ: {aiReflection.question}</small>
        </section>
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

      {weeklyPlan.status !== "empty" && (
        <section className={`weekly-training-plan ${weeklyPlan.status}`}>
          <div className="weekly-training-plan-header">
            <div>
              <span>План недели</span>
              <strong>{weeklyPlan.completed} / {weeklyPlan.target} позиций</strong>
            </div>
            <b>{weeklyPlan.progress}%</b>
          </div>

          <div
            className="weekly-training-plan-bar"
            role="progressbar"
            aria-label="Выполнение недельного плана"
            aria-valuemin={0}
            aria-valuemax={weeklyPlan.target}
            aria-valuenow={weeklyPlan.completed}
          >
            <div style={{ width: `${weeklyPlan.progress}%` }} />
          </div>

          <p>
            {weeklyPlan.focusThemeLabel
              ? `Главный фокус: ${weeklyPlan.focusThemeLabel}. `
              : ""}
            {weeklyPlan.nextAction}
          </p>
        </section>
      )}

      <div className="spaced-repetition-summary">
        <div>
          <span>Повторение ошибок</span>
          <strong>{repetition.due} к повторению</strong>
          <p>
            {repetition.weakThemeLabel
              ? `Слабая тема: ${repetition.weakThemeLabel}`
              : "Слабая тема появится после разбора ошибок."}
          </p>
        </div>

        <div className="spaced-repetition-actions">
          <button
            type="button"
            className="secondary"
            disabled={repetition.due === 0 || task.status === "preparing" || task.status === "ready"}
            onClick={onStartDueReview}
          >
            Повторить ошибки
          </button>
          {repetition.total > 0 && (
            <button
              type="button"
              className="secondary ghost"
              disabled={task.status === "preparing" || task.status === "ready"}
              onClick={onClearReviewQueue}
            >
              Очистить очередь
            </button>
          )}
        </div>
      </div>

      <div className={`best-move-training ${task.status}`}>
        <strong>{getStatusText(task)}</strong>

        {reviewContext && task.status !== "success" && (
          <p className="best-move-training-origin">
            {reviewContext.source === "spaced_repetition" ? "Повторение" : "В партии"} на {reviewContext.moveNumber}-м ходу: {formatMove(reviewContext.playedMove)}.
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
            {reviewContext && (
              <>
                <p className="best-move-training-verified">
                  {hasNextReviewMoment
                    ? `Момент ${reviewContext.sequenceIndex} решён. Результат засчитан, следующий момент готов к повторению.`
                    : reviewContext.sequenceTotal > 1
                      ? `Все ${reviewContext.sequenceTotal} ключевых момента решены. Серия завершена.`
                      : "Главная ошибка исправлена. Позиция решена самостоятельно, навык засчитан в прогресс."}
                </p>

                {reviewInsight && (
                <div className="best-move-training-insight">
                    <span>{reviewContext.themeLabel ?? "Закреплённый мотив"}</span>
                    <strong>{reviewInsight.title}</strong>
                    <p>{reviewInsight.trainingFocus}</p>
                  </div>
                )}
              </>
            )}

            {aiReflection && (
              <p className="best-move-training-verified">
                Мысль проверена на доске: найденный ход совпал с расчётом позиции.
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
          {task.status === "success" && hasNextReviewMoment ? (
            <button
              type="button"
              className="training-retry-button"
              onClick={onNextReviewMoment}
            >
              Следующий переломный момент
            </button>
          ) : task.status === "fail" && task.context ? (
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

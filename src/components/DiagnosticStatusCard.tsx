import type { GameReviewStatus } from "../analysis/gameReview";
import type { OnboardingSnapshot } from "../repositories/onboardingRepository";
import "./OnboardingFlow.css";

type Props = {
  state: Exclude<OnboardingSnapshot, { status: "pending" | "skipped" }>;
  gameStarted: boolean;
  gameFinished: boolean;
  halfMoves: number;
  reviewStatus: GameReviewStatus;
  reviewProgress: number;
  onOpenReview: () => void;
  onRestart: () => void;
  onDismissResult: () => void;
};

export default function DiagnosticStatusCard({
  state,
  gameStarted,
  gameFinished,
  halfMoves,
  reviewStatus,
  reviewProgress,
  onOpenReview,
  onRestart,
  onDismissResult,
}: Props) {
  if (state.status === "complete") {
    if (state.resultDismissed) {
      return null;
    }

    return (
      <section className="diagnostic-card complete" aria-label="Стартовый профиль">
        <div className="diagnostic-heading">
          <div>
            <span className="status-label">Стартовый профиль</span>
            <strong>{state.result.levelLabel}</strong>
          </div>
          <b>{state.result.accuracy}%</b>
        </div>
        <p>{state.result.summary}</p>
        <div className="diagnostic-metrics">
          <span>Решений <b>{state.result.decisionCount}</b></span>
          <span>Ошибок <b>{state.result.mistakes}</b></span>
          <span>Грубых <b>{state.result.blunders}</b></span>
        </div>
        {state.result.focusLabel && (
          <p className="diagnostic-focus">
            Первый приоритет: <strong>{state.result.focusLabel}</strong>
          </p>
        )}
        <p className="diagnostic-next-step">
          Следующий шаг: <strong>{state.result.nextStep}</strong>
        </p>
        <div className="diagnostic-actions">
          <button type="button" onClick={onOpenReview}>Открыть разбор</button>
          <button type="button" className="secondary" onClick={onDismissResult}>
            Скрыть профиль
          </button>
        </div>
      </section>
    );
  }

  const tooShort = gameFinished && halfMoves < 6;
  const reviewRunning = reviewStatus === "running" || reviewStatus === "paused";

  return (
    <section className="diagnostic-card" aria-label="Диагностическая партия">
      <span className="status-label">Диагностическая партия</span>
      <strong>
        {reviewRunning
          ? "Определяем стартовый профиль"
          : tooShort
            ? "Недостаточно решений"
            : gameFinished
              ? "Партия готова к разбору"
              : gameStarted
                ? "Играй как обычно"
                : "Диагностика приостановлена"}
      </strong>
      <p>
        {reviewRunning
          ? `Проверено позиций: ${reviewProgress}. Результат сохранится автоматически.`
          : tooShort
            ? "Для вывода нужно сыграть более длинную партию. Результат не придуман по малой выборке."
            : gameFinished
              ? "Запусти разбор: он оценит только твои решения и найдёт один главный приоритет."
              : gameStarted
                ? "Подсказки отключены. После завершения приложение разберёт твои решения."
                : "Запусти диагностическую партию заново с теми же настройками."}
      </p>
      {(tooShort || !gameStarted) && !reviewRunning && (
        <button type="button" onClick={onRestart}>Начать заново</button>
      )}
      {gameFinished && !tooShort && !reviewRunning && (
        <button type="button" onClick={onOpenReview}>Разобрать и получить профиль</button>
      )}
    </section>
  );
}

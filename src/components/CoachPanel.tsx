import type { EngineAnalysis } from "../types/chess";
import { buildCoachPlan } from "../analysis/coachPlan";
import { detectTacticalMotifs } from "../analysis/tacticalMotifs";
import { getFeatureAccess, type SubscriptionTier } from "../features/featureAccess";
import { useAiCoach } from "../hooks/useAiCoach";
import { useNetworkStatus } from "../hooks/useNetworkStatus";

type Props = {
  analysis: EngineAnalysis | null;
  position: string;
  subscriptionTier: SubscriptionTier;
};

const priorityLabels = {
  attack: "Атака",
  safety: "Безопасность",
  development: "Развитие",
  material: "Материал",
  position: "Позиция",
};

export default function CoachPanel({
  analysis,
  position,
  subscriptionTier,
}: Props) {
  const access = getFeatureAccess(subscriptionTier);
  const networkStatus = useNetworkStatus();
  const aiCoachEnabled = import.meta.env.VITE_AI_COACH_ENABLED === "true";
  const aiCoach = useAiCoach({
    position,
    analysis,
    subscriptionTier,
    dailyLimit: access.aiCoachDailyLimit,
    isOnline: networkStatus === "online",
    enabled: aiCoachEnabled,
  });

  if (!analysis) {
    return (
      <div className="coach-card coach-card-empty">
        <div className="coach-card-header">
          <span className="status-label">План тренера</span>
          <strong>Что делать сейчас?</strong>
        </div>

        <p className="coach-empty">
          Нажми «Показать лучший ход», чтобы получить короткий
          учебный план: цель позиции, главный ход и предупреждение,
          на что не стоит отвлекаться.
        </p>
      </div>
    );
  }

  const plan = buildCoachPlan(analysis, position);
  const tacticalMotifs = detectTacticalMotifs(
    position,
    analysis.bestMove,
  );

  return (
    <div className={`coach-card coach-priority-${plan.priority}`}>
      <div className="coach-card-header">
        <span className="status-label">План тренера</span>
        <strong>{plan.headline}</strong>
      </div>

      <div className="coach-meta-row">
        <span>{plan.phase}</span>
        <span>{priorityLabels[plan.priority]}</span>
        <span>{plan.evaluationText}</span>
      </div>

      <div className="coach-main-move">
        <span>Главный ход</span>
        <strong>{plan.mainMove}</strong>
      </div>

      {tacticalMotifs.length > 0 && (
        <div className="coach-tactics">
          <span>Тактический мотив</span>

          <div className="coach-tactics-list">
            {tacticalMotifs.map((motif) => (
              <article
                className={`coach-tactic coach-tactic-${motif.severity}`}
                key={motif.id}
              >
                <strong>{motif.title}</strong>
                <p>{motif.description}</p>
              </article>
            ))}
          </div>
        </div>
      )}

      <div className="coach-grid">
        <div className="coach-plan-block">
          <span>Первые ориентиры</span>

          <ol>
            {plan.firstSteps.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ol>
        </div>

        <div className="coach-plan-block muted">
          <span>Не забывай</span>

          <ul>
            {plan.watchOut.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="coach-line-preview">
        <span>Ожидаемое продолжение</span>
        <p>{plan.expectedLine}</p>
      </div>

      <section className="ai-coach" aria-labelledby="ai-coach-title">
        <div className="ai-coach-heading">
          <div>
            <span className="status-label">ИИ-разбор</span>
            <strong id="ai-coach-title">Объяснение идеи позиции</strong>
          </div>

          <span className="ai-coach-plan">
            {subscriptionTier === "premium"
              ? "Premium · без дневного лимита"
              : `Free · осталось ${aiCoach.remaining ?? 0} из ${access.aiCoachDailyLimit}`}
          </span>
        </div>

        {!aiCoachEnabled && (
          <p className="ai-coach-message">
            Модуль подготовлен. Он станет доступен после подключения
            защищённого серверного endpoint.
          </p>
        )}

        {aiCoachEnabled && networkStatus === "offline" && (
          <p className="ai-coach-message">
            ИИ-разбор требует интернет. Локальный план Stockfish выше
            продолжает работать офлайн.
          </p>
        )}

        {aiCoachEnabled && networkStatus === "online" && aiCoach.status === "idle" && (
          <>
            <p className="ai-coach-message">
              ИИ объяснит уже рассчитанный ход Stockfish простым языком и
              задаст один учебный вопрос.
            </p>

            <button
              type="button"
              className="ai-coach-action"
              onClick={() => void aiCoach.requestAdvice()}
            >
              Спросить ИИ-тренера
            </button>
          </>
        )}

        {aiCoach.status === "loading" && (
          <div className="ai-coach-loading" role="status" aria-live="polite">
            <span aria-hidden="true" />
            ИИ разбирает позицию…
          </div>
        )}

        {aiCoach.status === "success" && aiCoach.advice && (
          <div className="ai-coach-answer" aria-live="polite">
            <strong>{aiCoach.advice.headline}</strong>
            <p>{aiCoach.advice.explanation}</p>

            <ul>
              {aiCoach.advice.focusPoints.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>

            {aiCoach.advice.warning && (
              <p className="ai-coach-warning">Важно: {aiCoach.advice.warning}</p>
            )}

            <p className="ai-coach-question">Вопрос: {aiCoach.advice.question}</p>
          </div>
        )}

        {aiCoach.status === "error" && (
          <div className="ai-coach-error" role="alert">
            <p>{aiCoach.error}</p>
            <button type="button" onClick={() => void aiCoach.requestAdvice()}>
              Повторить
            </button>
          </div>
        )}

        {aiCoach.status === "limited" && (
          <div className="ai-coach-limit" role="status">
            {aiCoach.limitReason === "daily" ? (
              <>
                <strong>Бесплатные советы на сегодня закончились</strong>
                <p>
                  Продолжай использовать локальный план Stockfish. В Premium
                  дневного лимита Free не будет.
                </p>
              </>
            ) : (
              <>
                <strong>ИИ-тренер временно занят</strong>
                <p>
                  Попробуй немного позже. Локальный анализ Stockfish доступен
                  без ожидания.
                </p>
              </>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

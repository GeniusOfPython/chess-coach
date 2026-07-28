import { useMemo } from "react";
import type { EngineAnalysis } from "../types/chess";
import { buildCoachPlan } from "../analysis/coachPlan";
import { createVerifiedChessFacts } from "../analysis/verifiedChessFacts";
import type { FeatureAccess } from "../features/featureAccess";
import { useAiCoach } from "../hooks/useAiCoach";
import { useNetworkStatus } from "../hooks/useNetworkStatus";
import { getAiCoachAction } from "../ai/coachUiState";
import LoadingSkeleton from "./LoadingSkeleton";

type Props = {
  analysis: EngineAnalysis | null;
  position: string;
  access: FeatureAccess;
};

const priorityLabels = {
  attack: "Атака",
  safety: "Безопасность",
  development: "Развитие",
  material: "Материал",
  position: "Позиция",
};

const motifLabels: Record<string, string> = {
  "motif.mate": "Матовая угроза",
  "motif.check": "Шах",
  "motif.capture": "Взятие материала",
  "motif.promotion": "Превращение пешки",
  "motif.fork": "Вилка / двойная угроза",
  "motif.queen-attack": "Нападение на ферзя",
  "motif.castle": "Безопасность короля",
};

export default function CoachPanel({
  analysis,
  position,
  access,
}: Props) {
  const networkStatus = useNetworkStatus();
  const aiCoachEnabled = import.meta.env.VITE_AI_COACH_ENABLED === "true";
  const verifiedFacts = useMemo(() => {
    if (!analysis) {
      return null;
    }

    try {
      return createVerifiedChessFacts({ fen: position, analysis });
    } catch {
      return null;
    }
  }, [analysis, position]);
  const aiCoach = useAiCoach({
    facts: verifiedFacts,
    quota: access.aiCoachQuota,
    isOnline: networkStatus === "online",
    enabled: aiCoachEnabled,
  });

  if (!analysis || !verifiedFacts) {
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

  const plan = buildCoachPlan(verifiedFacts);
  const tacticalMotifs = verifiedFacts.facts.filter((fact) => fact.category === "motif");
  const displayedTier = aiCoach.serverQuota?.tier ?? access.tier;
  const displayedQuota = aiCoach.serverQuota ?? {
    tier: access.tier,
    period: access.aiCoachQuota.period,
    limit: access.aiCoachQuota.limit,
    remaining: aiCoach.remaining,
  };
  const aiCoachAction = getAiCoachAction({
    enabled: aiCoachEnabled,
    isOnline: networkStatus === "online",
    status: aiCoach.status,
    remaining: aiCoach.remaining,
  });

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
                className="coach-tactic coach-tactic-positional"
                key={motif.id}
              >
                <strong>{motifLabels[motif.id] ?? "Проверенный мотив"}</strong>
                <p>{motif.text}</p>
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

          <span
            className="ai-coach-plan"
            aria-label={`Осталось ${displayedQuota.remaining} из ${displayedQuota.limit} ${
              displayedQuota.period === "day" ? "сегодня" : "в этом месяце"
            }`}
            title={`Осталось ${displayedQuota.remaining} из ${displayedQuota.limit}`}
          >
            {displayedTier === "premium" ? "Premium" : "Free"}
            {` · ${displayedQuota.remaining}/${displayedQuota.limit} · ${
              displayedQuota.period === "day" ? "сегодня" : "месяц"
            }`}
          </span>
        </div>

        {!aiCoachEnabled && (
          <p className="ai-coach-message">
            Расширенный ИИ-разбор пока недоступен.
          </p>
        )}

        {aiCoachEnabled && networkStatus === "offline" && aiCoach.status !== "success" && (
          <p className="ai-coach-message">
            Для расширенного ИИ-разбора нужен интернет. Базовый план
            остаётся доступен офлайн.
          </p>
        )}

        {aiCoachEnabled && networkStatus === "online" && aiCoach.status === "idle" && (
          <p className="ai-coach-message">
            ИИ объяснит ключевые идеи позиции простым языком и задаст
            один учебный вопрос.
          </p>
        )}

        {aiCoach.status === "loading" && (
          <LoadingSkeleton label="Готовим персональное объяснение…" rows={3} />
        )}

        {aiCoach.status === "success" && aiCoach.advice && (
          <div className="ai-coach-answer" aria-live="polite">
            {aiCoach.adviceSource === "cache" && (
              <p className="ai-coach-cache-note">
                Сохранённый ИИ-разбор доступен без нового запроса.
              </p>
            )}
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

            <p className="ai-coach-grounding">
              Ответ сверён с расчётом позиции.
            </p>
          </div>
        )}

        {aiCoach.status === "error" && (
          <div className="ai-coach-error" role="alert">
            <p>{aiCoach.error}</p>
          </div>
        )}

        {aiCoach.status === "limited" && (
          <div className="ai-coach-limit" role="status">
            {aiCoach.limitReason === "quota" ? (
              <>
                <strong>
                  {displayedTier === "premium"
                    ? "Месячная квота ИИ-советов закончилась"
                    : "Бесплатные советы на сегодня закончились"}
                </strong>
                <p>
                  Базовый план тренировки остаётся доступен.
                  {displayedTier === "free" &&
                    " В Premium доступна расширенная месячная квота."}
                </p>
              </>
            ) : (
              <>
                <strong>ИИ-тренер временно занят</strong>
                <p>
                  Попробуй немного позже. Базовый разбор остаётся доступен.
                </p>
              </>
            )}
          </div>
        )}

        {aiCoachAction && (
          <button
            type="button"
            className="ai-coach-action"
            disabled={aiCoachAction.disabled}
            onClick={() => void aiCoach.requestAdvice()}
          >
            {aiCoachAction.label}
          </button>
        )}
      </section>
    </div>
  );
}

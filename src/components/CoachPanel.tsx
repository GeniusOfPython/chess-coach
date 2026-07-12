import type { EngineAnalysis } from "../types/chess";
import { buildCoachPlan } from "../analysis/coachPlan";

type Props = {
  analysis: EngineAnalysis | null;
  position: string;
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
}: Props) {
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
    </div>
  );
}

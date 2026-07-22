import { useState } from "react";
import "./OnboardingFlow.css";
import type {
  ExperienceLevel,
  LearningGoal,
} from "../analysis/diagnosticProfile";

type Props = {
  onStart: (selection: {
    goal: LearningGoal;
    experience: ExperienceLevel;
  }) => void;
  onSkip: () => void;
};

const goals: Array<{
  id: LearningGoal;
  title: string;
  description: string;
}> = [
  {
    id: "reduce_mistakes",
    title: "Меньше грубых ошибок",
    description: "Научиться замечать угрозы до хода.",
  },
  {
    id: "understand_positions",
    title: "Лучше понимать позиции",
    description: "Разбирать планы и причины сильных ходов.",
  },
  {
    id: "build_habit",
    title: "Тренироваться регулярно",
    description: "Получать короткий понятный план на неделю.",
  },
];

const experienceLevels: Array<{
  id: ExperienceLevel;
  title: string;
  description: string;
}> = [
  {
    id: "beginner",
    title: "Начинаю",
    description: "Знаю ходы фигур или только осваиваю правила.",
  },
  {
    id: "basic",
    title: "Знаю основы",
    description: "Играю партии, но часто теряю фигуры и план.",
  },
  {
    id: "regular",
    title: "Играю регулярно",
    description: "Знаком с тактикой, дебютными принципами и анализом.",
  },
];

export default function OnboardingDialog({ onStart, onSkip }: Props) {
  const [goal, setGoal] = useState<LearningGoal | null>(null);
  const [experience, setExperience] = useState<ExperienceLevel | null>(null);

  return (
    <div className="onboarding-backdrop" role="presentation">
      <section
        className="onboarding-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-title"
        aria-describedby="onboarding-description"
      >
        <span className="status-label">Первый запуск</span>
        <h2 id="onboarding-title">Настроим тренера под тебя</h2>
        <p id="onboarding-description">
          Два ответа определят стартовую сложность. Затем одна диагностическая
          партия покажет реальный учебный приоритет.
        </p>

        <fieldset>
          <legend>Главная цель</legend>
          <div className="onboarding-options">
            {goals.map((option) => (
              <button
                type="button"
                className={goal === option.id ? "selected" : ""}
                aria-pressed={goal === option.id}
                autoFocus={option.id === "reduce_mistakes"}
                key={option.id}
                onClick={() => setGoal(option.id)}
              >
                <strong>{option.title}</strong>
                <span>{option.description}</span>
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend>Текущий опыт</legend>
          <div className="onboarding-options compact">
            {experienceLevels.map((option) => (
              <button
                type="button"
                className={experience === option.id ? "selected" : ""}
                aria-pressed={experience === option.id}
                key={option.id}
                onClick={() => setExperience(option.id)}
              >
                <strong>{option.title}</strong>
                <span>{option.description}</span>
              </button>
            ))}
          </div>
        </fieldset>

        <div className="onboarding-actions">
          <button
            type="button"
            className="onboarding-start"
            disabled={!goal || !experience}
            onClick={() => {
              if (goal && experience) {
                onStart({ goal, experience });
              }
            }}
          >
            Начать диагностическую партию
          </button>
          <button type="button" className="secondary" onClick={onSkip}>
            Пропустить
          </button>
        </div>
      </section>
    </div>
  );
}

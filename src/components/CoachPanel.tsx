import type { EngineAnalysis } from "../types/chess";
import { explainEngineMove } from "../utils/explainMove";

type Props = {
  analysis: EngineAnalysis | null;
  position: string;
};

function formatMove(move: string) {
  if (!move || move === "(none)") {
    return "ход не найден";
  }

  const from = move.slice(0, 2);
  const to = move.slice(2, 4);
  const promotion = move.slice(4);

  if (promotion) {
    return `${from} → ${to}, превращение в ${promotion.toUpperCase()}`;
  }

  return `${from} → ${to}`;
}

function formatVariation(variation: string[]) {
  if (variation.length === 0) {
    return "Вариант пока не рассчитан.";
  }

  return variation.slice(0, 8).map(formatMove).join(" • ");
}

function getSimplePlan(analysis: EngineAnalysis, position: string) {
  const explanations = explainEngineMove(
    position,
    analysis.bestMove,
  );

  const plan = [
    `Сначала сыграй ${formatMove(analysis.bestMove)}.`,
    ...explanations,
  ];

  if (analysis.variation.length >= 2) {
    plan.push(
      `После ожидаемого ответа соперника смотри на продолжение: ${formatVariation(
        analysis.variation.slice(1, 5),
      )}.`,
    );
  }

  plan.push(
    "После каждого ответа соперника анализ нужно запускать заново: хороший ход в одной позиции не превращается в готовый план на всю партию.",
  );

  return plan.slice(0, 6);
}

export default function CoachPanel({
  analysis,
  position,
}: Props) {
  if (!analysis) {
    return (
      <div className="coach-card">
        <span className="status-label">План тренера</span>

        <p className="coach-empty">
          Нажми «Показать лучший ход», чтобы получить не
          только стрелку, но и короткий план по позиции.
        </p>
      </div>
    );
  }

  const plan = getSimplePlan(analysis, position);

  return (
    <div className="coach-card">
      <span className="status-label">План тренера</span>

      <div className="coach-main-move">
        <span>Главная рекомендация</span>
        <strong>{formatMove(analysis.bestMove)}</strong>
      </div>

      <div className="coach-plan">
        <span>Как играть дальше</span>

        <ol>
          {plan.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ol>
      </div>
    </div>
  );
}

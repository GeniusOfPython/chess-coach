import { explainEngineMove } from "../utils/explainMove";
import type { MoveReviewVerdict } from "../analysis/reviewTypes";

export type MoveReview = {
  playedMove: string;
  bestMove: string | null;
  matchedBestMove: boolean | null;
  positionBeforeMove: string;
  isEvaluating: boolean;
  evaluationBeforeWhite: number | null;
  evaluationAfterWhite: number | null;
  evaluationLoss: number | null;
  verdict: MoveReviewVerdict;
};
export type { MoveReviewVerdict };

const presentation: Record<MoveReviewVerdict, { label: string; title: string; tone: string }> = {
  best: { label: "Лучший ход", title: "Ты нашёл сильнейшее продолжение", tone: "good" },
  good: { label: "Хороший ход", title: "Решение сохраняет качество позиции", tone: "good" },
  inaccuracy: { label: "Неточность", title: "Был вариант немного сильнее", tone: "warning" },
  mistake: { label: "Ошибка", title: "Ход заметно ухудшил позицию", tone: "bad" },
  blunder: { label: "Грубая ошибка", title: "Ход серьёзно изменил оценку позиции", tone: "critical" },
  unknown: { label: "Без оценки", title: "Недостаточно данных для точного вердикта", tone: "neutral" },
};

function formatMove(move: string | null) {
  if (!move || move === "(none)") return "Нет хода";
  const promotion = move.slice(4);
  return promotion
    ? `${move.slice(0, 2)} → ${move.slice(2, 4)}, ${promotion.toUpperCase()}`
    : `${move.slice(0, 2)} → ${move.slice(2, 4)}`;
}

export default function MoveReviewPanel({ review, canShowExplanations = true }: {
  review: MoveReview | null;
  canShowExplanations?: boolean;
}) {
  if (!review) {
    return <div className="move-review-card"><span className="status-label">Разбор последнего хода</span><div className="move-review neutral"><strong>Пока нет хода для разбора</strong><p>Сделай ход на доске — оценка решения появится автоматически.</p></div></div>;
  }

  if (review.bestMove === null) {
    return <div className="move-review-card"><span className="status-label">Разбор последнего хода</span><div className="move-review neutral"><strong>{review.isEvaluating ? "Оцениваем ход…" : `Сыграно: ${formatMove(review.playedMove)}`}</strong><p>{review.isEvaluating ? "Результат появится автоматически." : "Не удалось получить оценку."}</p></div></div>;
  }

  const view = presentation[review.verdict];
  const showAlternative = !review.matchedBestMove;
  const explanations = showAlternative
    ? explainEngineMove(review.positionBeforeMove, review.bestMove)
    : [];

  return (
    <div className="move-review-card">
      <span className="status-label">Разбор последнего хода</span>
      <div className={`move-review ${view.tone}`}>
        <div className="move-review-verdict-row">
          <strong>{view.title}</strong>
          <span className="move-review-verdict-badge">{view.label}</span>
        </div>
        <div className="move-review-grid">
          <span>Твой ход</span><b>{formatMove(review.playedMove)}</b>
          {showAlternative && <><span>Лучший ход</span><b>{formatMove(review.bestMove)}</b></>}
          {review.evaluationLoss !== null && <><span>Потеря оценки</span><b>{review.evaluationLoss.toFixed(2)}</b></>}
        </div>
        {review.isEvaluating && <p>Оцениваем последствия хода…</p>}
        {canShowExplanations && explanations.length > 0 && (
          <div className="move-review-explanation"><span>Почему другой ход был сильнее</span><ul>{explanations.map((item) => <li key={item}>{item}</li>)}</ul></div>
        )}
      </div>
    </div>
  );
}

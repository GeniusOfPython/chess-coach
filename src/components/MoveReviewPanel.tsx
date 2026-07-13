import { explainEngineMove } from "../utils/explainMove";

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

export type MoveReviewVerdict =
  | "best"
  | "good"
  | "inaccuracy"
  | "mistake"
  | "blunder"
  | "unknown";

type Props = {
  review: MoveReview | null;
  canShowExplanations?: boolean;
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

export default function MoveReviewPanel({
  review,
  canShowExplanations = true,
}: Props) {
  if (!review) {
    return (
      <div className="move-review-card">
        <span className="status-label">
          Разбор последнего хода
        </span>

        <div className="move-review neutral">
          <strong>Пока нет хода для разбора</strong>

          <p>
            Чтобы увидеть оценку своего решения: сначала
            нажми «Показать лучший ход», затем сделай ход
            на доске.
          </p>
        </div>
      </div>
    );
  }

  if (review.bestMove === null) {
    return (
      <div className="move-review-card">
        <span className="status-label">
          Разбор последнего хода
        </span>

        <div className="move-review neutral">
          <strong>
            Сыграно: {formatMove(review.playedMove)}
          </strong>

          <p>
            Ход не сравнивался с рекомендацией. Чтобы
            приложение оценило твой выбор, перед ходом
            нажми «Показать лучший ход».
          </p>
        </div>
      </div>
    );
  }

  if (review.matchedBestMove) {
    return (
      <div className="move-review-card">
        <span className="status-label">
          Разбор последнего хода
        </span>

        <div className="move-review good">
          <strong>
            Хорошо: ты сыграл лучший ход Stockfish
          </strong>

          <p>
            Сыграно: {formatMove(review.playedMove)}
          </p>
        </div>
      </div>
    );
  }

  const explanations = explainEngineMove(
    review.positionBeforeMove,
    review.bestMove,
  );

  return (
    <div className="move-review-card">
      <span className="status-label">
        Разбор последнего хода
      </span>

      <div className="move-review warning">
        <strong>
          Ты отклонился от лучшего варианта
        </strong>

        <div className="move-review-grid">
          <span>Твой ход</span>
          <b>{formatMove(review.playedMove)}</b>

          <span>Лучший ход</span>
          <b>{formatMove(review.bestMove)}</b>
        </div>

        {review.isEvaluating && (
          <p>Stockfish оценивает последствия хода…</p>
        )}

        {review.evaluationLoss !== null && (
          <div className="move-review-grid">
            <span>Потеря оценки</span>
            <b>{review.evaluationLoss.toFixed(2)}</b>
          </div>
        )}

        {canShowExplanations && (
        <div className="move-review-explanation">
          <span>
            Почему Stockfish предпочитал другой ход
          </span>

          <ul>
            {explanations.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        )}
      </div>
    </div>
  );
}

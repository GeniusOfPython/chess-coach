import { explainEngineMove } from "../utils/explainMove";
import PremiumFeatureNotice from "./PremiumFeatureNotice";
import "./MoveReviewPanel.css";

export type MoveReviewVerdict =
  | "best"
  | "good"
  | "inaccuracy"
  | "mistake"
  | "blunder"
  | "unknown";

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

function formatEvaluation(value: number | null) {
  if (value === null) {
    return "—";
  }

  const sign = value > 0 ? "+" : "";

  return `${sign}${value.toFixed(2)}`;
}

function formatLoss(value: number | null) {
  if (value === null) {
    return "—";
  }

  return value.toFixed(2);
}

function getVerdictTitle(verdict: MoveReviewVerdict) {
  if (verdict === "best") {
    return "Отлично: ты сыграл лучший ход Stockfish";
  }

  if (verdict === "good") {
    return "Хороший ход";
  }

  if (verdict === "inaccuracy") {
    return "Небольшая неточность";
  }

  if (verdict === "mistake") {
    return "Ошибка";
  }

  if (verdict === "blunder") {
    return "Грубая ошибка";
  }

  return "Ход разобран частично";
}

function getVerdictDescription(verdict: MoveReviewVerdict) {
  if (verdict === "best") {
    return "Твой ход совпал с первой рекомендацией движка.";
  }

  if (verdict === "good") {
    return "Ход почти не ухудшил позицию относительно рекомендации Stockfish.";
  }

  if (verdict === "inaccuracy") {
    return "Позиция стала немного хуже, но это ещё не серьёзная ошибка.";
  }

  if (verdict === "mistake") {
    return "Ход заметно ухудшил позицию. Стоит посмотреть, что давал лучший вариант.";
  }

  if (verdict === "blunder") {
    return "Ход резко ухудшил позицию. Вероятно, была пропущена тактика или важная угроза.";
  }

  return "Для точной оценки не хватило данных после хода.";
}

function getReviewClassName(verdict: MoveReviewVerdict) {
  if (verdict === "best" || verdict === "good") {
    return "move-review good";
  }

  if (verdict === "inaccuracy") {
    return "move-review warning";
  }

  if (verdict === "mistake" || verdict === "blunder") {
    return "move-review bad";
  }

  return "move-review neutral";
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
            Сначала нажми «Показать лучший ход», затем
            сделай ход на доске. После этого приложение
            сравнит твой ход с рекомендацией Stockfish.
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

  const explanations = explainEngineMove(
    review.positionBeforeMove,
    review.bestMove,
  );

  return (
    <div className="move-review-card">
      <span className="status-label">
        Разбор последнего хода
      </span>

      <div className={getReviewClassName(review.verdict)}>
        <strong>{getVerdictTitle(review.verdict)}</strong>

        <p>{getVerdictDescription(review.verdict)}</p>

        {review.isEvaluating && (
          <p>Stockfish досчитывает оценку после твоего хода…</p>
        )}

        <div className="move-review-grid">
          <span>Твой ход</span>
          <b>{formatMove(review.playedMove)}</b>

          <span>Лучший ход</span>
          <b>{formatMove(review.bestMove)}</b>

          <span>Оценка до хода</span>
          <b>{formatEvaluation(review.evaluationBeforeWhite)}</b>

          <span>Оценка после хода</span>
          <b>{formatEvaluation(review.evaluationAfterWhite)}</b>

          <span>Потеря оценки</span>
          <b>{formatLoss(review.evaluationLoss)}</b>
        </div>

        {!review.matchedBestMove && canShowExplanations && (
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

        {!review.matchedBestMove && !canShowExplanations && (
          <PremiumFeatureNotice
            featureKey="moveExplanations"
            description="Подробные пояснения к альтернативному ходу будут доступны в премиум-версии."
          />
        )}
      </div>
    </div>
  );
}

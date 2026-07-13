import type { MoveReview } from "./MoveReviewPanel";

function formatMove(move: string | null) {
  if (!move) return "—";
  return `${move.slice(0, 2)} → ${move.slice(2, 4)}`;
}

export default function MoveFeedbackCard({
  review,
}: {
  review: MoveReview | null;
}) {
  if (!review?.isEvaluating) return null;

  return (
    <div className="move-feedback-card evaluating" aria-live="polite">
      <div>
        <span className="move-feedback-label">
          Stockfish оценивает ход…
        </span>
        <strong>{formatMove(review.playedMove)}</strong>
      </div>
    </div>
  );
}

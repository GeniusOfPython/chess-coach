import { useEffect, type CSSProperties } from "react";
import type { GameResultInfo } from "../game/gameResult";

type Props = {
  result: GameResultInfo;
  historyLength: number;
  onReview: () => void;
  onNewGame: () => void;
  onClose: () => void;
};

function ResultMark({ winner }: Pick<GameResultInfo, "winner">) {
  return (
    <svg
      className="result-celebration-mark"
      viewBox="0 0 96 96"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="48" cy="48" r="42" className="result-mark-orbit" />
      <path d="M25 36 38 49 48 27l10 22 13-13-5 34H30l-5-34Z" className="result-mark-crown" />
      <path d="M32 76h32" className="result-mark-base" />
      {winner === "draw" ? (
        <path d="M36 47h24M36 57h24" className="result-mark-symbol" />
      ) : (
        <path d="m48 12 2.6 7.4L58 22l-7.4 2.6L48 32l-2.6-7.4L38 22l7.4-2.6L48 12Z" className="result-mark-symbol" />
      )}
    </svg>
  );
}

export default function GameResultCelebration({
  result,
  historyLength,
  onReview,
  onNewGame,
  onClose,
}: Props) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className="result-celebration-backdrop" role="presentation">
      <div
        className={`result-celebration ${result.winner ?? "finished"}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="result-celebration-title"
        aria-describedby="result-celebration-description"
      >
        <div className="result-confetti" aria-hidden="true">
          {Array.from({ length: 18 }, (_, index) => (
            <i key={index} style={{ "--confetti-index": index } as CSSProperties} />
          ))}
        </div>

        <button
          type="button"
          className="result-celebration-close"
          aria-label="Закрыть итог партии"
          onClick={onClose}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="m7 7 10 10M17 7 7 17" />
          </svg>
        </button>

        <ResultMark winner={result.winner} />

        <span className="result-celebration-label">Партия завершена</span>
        <strong id="result-celebration-title">{result.title}</strong>
        <span className="result-celebration-score">{result.result}</span>
        <p id="result-celebration-description">{result.description}</p>

        <div className="result-celebration-meta">
          <span>Ходов в партии</span>
          <b>{historyLength}</b>
        </div>

        <div className="result-celebration-actions">
          <button type="button" onClick={onReview} autoFocus>
            Перейти к разбору
          </button>
          <button type="button" className="secondary" onClick={onNewGame}>
            Новая партия
          </button>
        </div>
      </div>
    </div>
  );
}

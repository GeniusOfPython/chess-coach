import type { Color } from "chess.js";
import type { MoveReviewVerdict } from "./MoveReviewPanel";
import type { LearningJournalItem } from "../analysis/learningJournal";
import "./LearningJournalPanel.css";

type Props = {
  items: LearningJournalItem[];
  onClear: () => void;
};

function formatMove(move: string) {
  if (!move || move === "(none)") {
    return "Нет хода";
  }

  const from = move.slice(0, 2);
  const to = move.slice(2, 4);
  const promotion = move.slice(4);

  if (promotion) {
    return `${from} → ${to}, ${promotion.toUpperCase()}`;
  }

  return `${from} → ${to}`;
}

function formatMoveNumber({
  moveNumber,
  side,
}: {
  moveNumber: number;
  side: Color;
}) {
  return side === "w" ? `${moveNumber}.` : `${moveNumber}...`;
}

function getVerdictLabel(verdict: MoveReviewVerdict) {
  if (verdict === "inaccuracy") {
    return "Неточность";
  }

  if (verdict === "mistake") {
    return "Ошибка";
  }

  if (verdict === "blunder") {
    return "Грубая ошибка";
  }

  return "Замечание";
}

function getVerdictClassName(verdict: MoveReviewVerdict) {
  if (verdict === "blunder") {
    return "learning-journal-verdict blunder";
  }

  if (verdict === "mistake") {
    return "learning-journal-verdict mistake";
  }

  return "learning-journal-verdict inaccuracy";
}

export default function LearningJournalPanel({
  items,
  onClear,
}: Props) {
  return (
    <div className="learning-journal-card">
      <div className="learning-journal-header">
        <span className="status-label">Журнал ошибок</span>

        {items.length > 0 && (
          <button
            type="button"
            className="learning-journal-clear"
            onClick={onClear}
          >
            Очистить
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <p className="learning-journal-empty">
          Здесь будут собираться неточности, ошибки и грубые
          ошибки из текущей партии. Хорошие и лучшие ходы в
          журнал не попадают.
        </p>
      ) : (
        <div className="learning-journal-list">
          {items.map((item) => (
            <div className="learning-journal-item" key={item.id}>
              <div className="learning-journal-topline">
                <strong>
                  {formatMoveNumber({
                    moveNumber: item.moveNumber,
                    side: item.side,
                  })}{" "}
                  {formatMove(item.playedMove)}
                </strong>

                <span className={getVerdictClassName(item.verdict)}>
                  {getVerdictLabel(item.verdict)}
                </span>
              </div>

              <div className="learning-journal-grid">
                <span>Лучше было</span>
                <b>{formatMove(item.bestMove)}</b>

                <span>Потеря оценки</span>
                <b>{item.evaluationLoss.toFixed(2)}</b>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

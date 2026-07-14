import { useEffect, useState } from "react";

type Props = {
  canUndo: boolean;
  isAnalyzing: boolean;
  isGameOver: boolean;
  canAnalyze?: boolean;
  canTerminate?: boolean;
  showNewGame?: boolean;
  onNewGame: () => void;
  onUndoMove: () => void;
  onAnalyze: () => void;
  onTerminate?: () => void;
};

export default function GameControls({
  canUndo,
  isAnalyzing,
  isGameOver,
  canAnalyze = true,
  canTerminate = false,
  showNewGame = true,
  onNewGame,
  onUndoMove,
  onAnalyze,
  onTerminate,
}: Props) {
  const [confirmingTermination, setConfirmingTermination] = useState(false);

  useEffect(() => {
    if (!canTerminate) {
      setConfirmingTermination(false);
    }
  }, [canTerminate]);

  if (canTerminate && onTerminate) {
    return (
      <div className="resign-controls">
        {confirmingTermination ? (
          <>
            <button
              type="button"
              className="resign-confirm"
              onClick={onTerminate}
            >
              Завершить и засчитать поражение
            </button>
            <button
              type="button"
              className="secondary"
              onClick={() => setConfirmingTermination(false)}
            >
              Отмена
            </button>
          </>
        ) : (
          <button
            type="button"
            className="secondary resign-action"
            onClick={() => setConfirmingTermination(true)}
          >
            Завершить партию
          </button>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="controls">
        {showNewGame && (
          <button type="button" onClick={onNewGame}>
            Новая партия
          </button>
        )}

        <button
          type="button"
          className="secondary"
          onClick={onUndoMove}
          disabled={!canUndo}
        >
          Отменить ход
        </button>
      </div>

      {canAnalyze && (
        <button
          type="button"
          className="analyze-button"
          onClick={onAnalyze}
          disabled={isAnalyzing || isGameOver}
        >
          {isAnalyzing
            ? "Stockfish анализирует…"
            : "Показать лучший ход"}
        </button>
      )}
    </>
  );
}

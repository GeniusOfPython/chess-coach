type Props = {
  canUndo: boolean;
  isAnalyzing: boolean;
  isGameOver: boolean;
  onNewGame: () => void;
  onUndoMove: () => void;
  onAnalyze: () => void;
};

export default function GameControls({
  canUndo,
  isAnalyzing,
  isGameOver,
  onNewGame,
  onUndoMove,
  onAnalyze,
}: Props) {
  return (
    <>
      <div className="controls">
        <button type="button" onClick={onNewGame}>
          Новая партия
        </button>

        <button
          type="button"
          className="secondary"
          onClick={onUndoMove}
          disabled={!canUndo}
        >
          Отменить ход
        </button>
      </div>

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
    </>
  );
}
type Props = {
  currentIndex: number;
  totalPositions: number;
  isViewingCurrentPosition: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onCurrent: () => void;
};

export default function MoveNavigatorPanel({
  currentIndex,
  totalPositions,
  isViewingCurrentPosition,
  onPrevious,
  onNext,
  onCurrent,
}: Props) {
  const lastIndex = Math.max(0, totalPositions - 1);

  return (
    <div className="move-navigator-card">
      <span className="status-label">Навигация по партии</span>

      <div className="move-navigator-status">
        <strong>
          Позиция {currentIndex} из {lastIndex}
        </strong>

        <p>
          {isViewingCurrentPosition
            ? "Показана текущая позиция. Можно делать ходы и анализировать."
            : "Показана старая позиция. Вернись к текущей позиции, чтобы продолжить партию."}
        </p>
      </div>

      <div className="move-navigator-buttons">
        <button
          type="button"
          className="secondary"
          disabled={currentIndex <= 0}
          onClick={onPrevious}
        >
          ← Назад
        </button>

        <button
          type="button"
          className="secondary"
          disabled={currentIndex >= lastIndex}
          onClick={onNext}
        >
          Вперёд →
        </button>

        <button
          type="button"
          disabled={isViewingCurrentPosition}
          onClick={onCurrent}
        >
          К текущей
        </button>
      </div>
    </div>
  );
}

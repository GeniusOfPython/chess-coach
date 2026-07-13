type TurnOwner = "player" | "bot" | null;

type Props = {
  stateText: string;
  active: boolean;
  turnOwner: TurnOwner;
  showStartAction: boolean;
  startDisabled?: boolean;
  error?: string | null;
  retryDisabled?: boolean;
  onStart: () => void;
  onRetry?: () => void;
};

export default function GameSessionCard({
  stateText,
  active,
  turnOwner,
  showStartAction,
  startDisabled = false,
  error = null,
  retryDisabled = false,
  onStart,
  onRetry,
}: Props) {
  return (
    <div className={`status-card game-session-card ${active ? "active" : ""}`}>
      <div className="game-session-heading">
        <span className="status-label">Состояние партии</span>

        {active && (
          <span className="active-game-indicator">
            <span className="active-game-dot" aria-hidden="true" />
            Партия идёт
          </span>
        )}
      </div>

      <strong aria-live="polite">{stateText}</strong>

      {active && turnOwner && (
        <span
          className={`turn-indicator ${
            turnOwner === "bot"
              ? "turn-indicator-bot"
              : "turn-indicator-player"
          }`}
        >
          {turnOwner === "bot" ? "Ход бота" : "Ваш ход"}
        </span>
      )}

      {active && error && onRetry && (
        <div className="game-session-recovery" role="alert">
          <span>{error}</span>
          <button
            type="button"
            disabled={retryDisabled}
            onClick={onRetry}
          >
            Повторить ход
          </button>
        </div>
      )}

      {showStartAction && (
        <button
          type="button"
          className="game-session-start"
          disabled={startDisabled}
          onClick={onStart}
        >
          Старт партии
        </button>
      )}
    </div>
  );
}

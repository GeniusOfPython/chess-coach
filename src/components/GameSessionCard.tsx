type TurnOwner = "player" | "bot" | null;

type Props = {
  stateText: string;
  active: boolean;
  turnOwner: TurnOwner;
  showStartAction: boolean;
  startDisabled?: boolean;
  onStart: () => void;
};

export default function GameSessionCard({
  stateText,
  active,
  turnOwner,
  showStartAction,
  startDisabled = false,
  onStart,
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

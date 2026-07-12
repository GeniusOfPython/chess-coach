export type GameMode = "analysis" | "bot";

type Props = {
  mode: GameMode;
  disabled?: boolean;
  onChange: (mode: GameMode) => void;
};

export default function GameModeSelector({
  mode,
  disabled = false,
  onChange,
}: Props) {
  return (
    <div className="mode-card">
      <span className="status-label">Режим</span>

      <div className="mode-buttons">
        <button
          type="button"
          className={
            mode === "analysis"
              ? "mode-button active"
              : "mode-button"
          }
          disabled={disabled}
          onClick={() => onChange("analysis")}
        >
          Анализ партии
        </button>

        <button
          type="button"
          className={
            mode === "bot"
              ? "mode-button active"
              : "mode-button"
          }
          disabled={disabled}
          onClick={() => onChange("bot")}
        >
          Против бота
        </button>
      </div>

      <p className="mode-description">
        {mode === "analysis"
          ? "Можно вручную двигать и белые, и чёрные фигуры."
          : "Игрок ходит белыми, Stockfish отвечает чёрными."}
      </p>
    </div>
  );
}
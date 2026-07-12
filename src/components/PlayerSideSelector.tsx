import type { Color } from "chess.js";

type Props = {
  side: Color;
  disabled?: boolean;
  onChange: (side: Color) => void;
};

export default function PlayerSideSelector({
  side,
  disabled = false,
  onChange,
}: Props) {
  return (
    <div className="mode-card">
      <span className="status-label">
        Сторона игрока
      </span>

      <div className="mode-buttons">
        <button
          type="button"
          className={
            side === "w"
              ? "mode-button active"
              : "mode-button"
          }
          disabled={disabled}
          onClick={() => onChange("w")}
        >
          Белые
        </button>

        <button
          type="button"
          className={
            side === "b"
              ? "mode-button active"
              : "mode-button"
          }
          disabled={disabled}
          onClick={() => onChange("b")}
        >
          Чёрные
        </button>
      </div>

      <p className="mode-description">
        {side === "w"
          ? "Игрок ходит белыми, бот отвечает чёрными."
          : "Бот ходит белыми первым, игрок отвечает чёрными."}
      </p>
    </div>
  );
}
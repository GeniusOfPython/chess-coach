import {
  BOT_LEVELS,
  type BotLevelId,
} from "../types/bot";

type Props = {
  levelId: BotLevelId;
  disabled?: boolean;
  onChange: (levelId: BotLevelId) => void;
};

export default function BotLevelSelector({
  levelId,
  disabled = false,
  onChange,
}: Props) {
  const currentLevel =
    BOT_LEVELS.find((level) => level.id === levelId) ??
    BOT_LEVELS[1];

  return (
    <div className="mode-card">
      <span className="status-label">
        Уровень бота
      </span>

      <select
        className="bot-level-select"
        value={levelId}
        disabled={disabled}
        onChange={(event) =>
          onChange(event.target.value as BotLevelId)
        }
      >
        {BOT_LEVELS.map((level) => (
          <option key={level.id} value={level.id}>
            {level.title}
          </option>
        ))}
      </select>

      <p className="mode-description">
        {currentLevel.description}
      </p>
    </div>
  );
}

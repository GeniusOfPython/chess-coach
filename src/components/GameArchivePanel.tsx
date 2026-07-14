import type { ArchivedGame } from "../game/gameArchive";
import { getBotLevel } from "../types/bot";
import { buildGameArchiveStats } from "../game/gameArchiveStats";
import "./GameArchivePanel.css";

type Props = {
  games: ArchivedGame[];
  onOpen: (game: ArchivedGame) => void;
  onRemove: (gameId: string) => void;
  onClear: () => void;
};

const outcomeLabels = {
  win: "Победа",
  loss: "Поражение",
  draw: "Ничья",
  completed: "Завершена",
};

const dateFormatter = new Intl.DateTimeFormat("ru", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

export default function GameArchivePanel({
  games,
  onOpen,
  onRemove,
  onClear,
}: Props) {
  if (games.length === 0) {
    return (
      <div className="game-archive-empty">
        <strong>Завершённых партий пока нет</strong>
        <p>
          После мата, пата или ничьей партия автоматически появится здесь.
        </p>
      </div>
    );
  }

  const stats = buildGameArchiveStats(games);

  return (
    <div className="game-archive">
      {stats.botGames > 0 && (
        <section className="game-archive-stats" aria-label="Статистика против бота">
          <div className="game-archive-stat-grid">
            <div>
              <span>Против бота</span>
              <strong>{stats.botGames}</strong>
              <small>{`${stats.wins} побед · ${stats.draws} ничьих`}</small>
            </div>
            <div>
              <span>Набрано очков</span>
              <strong>{stats.scorePercent}%</strong>
              <small>ничья считается за ½</small>
            </div>
            <div>
              <span>Серия побед</span>
              <strong>{stats.currentWinStreak}</strong>
              <small>лучший результат: {stats.bestWinStreak}</small>
            </div>
          </div>

        </section>
      )}

      <div className="game-archive-heading">
        <span>Сохранено партий: {games.length}</span>
        <button type="button" onClick={onClear}>Очистить архив</button>
      </div>

      <div className="game-archive-list">
        {games.map((game) => (
          <article className="game-archive-item" key={game.id}>
            <div className="game-archive-main">
              <div>
                <span className={`game-archive-outcome ${game.outcome}`}>
                  {outcomeLabels[game.outcome]}
                </span>
                <strong>{game.result}</strong>
              </div>

              <time dateTime={game.finishedAt}>
                {dateFormatter.format(new Date(game.finishedAt))}
              </time>
            </div>

            <p>
              {game.mode === "bot"
                ? `Против бота · ${getBotLevel(game.botLevelId ?? "casual").title} · ${
                  game.playerSide === "b" ? "чёрными" : "белыми"
                }`
                : "Режим анализа"}
              {` · ${game.halfMoves} ходов`}
            </p>

            <div className="game-archive-actions">
              <button type="button" onClick={() => onOpen(game)}>
                Открыть партию
              </button>
              <button
                type="button"
                className="secondary"
                onClick={() => onRemove(game.id)}
              >
                Удалить
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

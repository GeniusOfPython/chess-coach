import {
  chessAchievements,
  type UnlockedChessAchievement,
} from "../features/chessAchievements";
import "./ChessAchievementsPanel.css";

export default function ChessAchievementsPanel({
  unlocked,
}: {
  unlocked: UnlockedChessAchievement[];
}) {
  const unlockedIds = new Set(unlocked.map((item) => item.id));

  return (
    <div className="chess-achievements">
      <div className="chess-achievements-summary">
        <span>Открыто</span>
        <strong>{unlocked.length} / {chessAchievements.length}</strong>
      </div>

      <div className="chess-achievements-grid">
        {chessAchievements.map((achievement) => {
          const isUnlocked = unlockedIds.has(achievement.id);

          return (
            <article
              className={isUnlocked ? "unlocked" : "locked"}
              key={achievement.id}
            >
              <span aria-hidden="true">{isUnlocked ? "✓" : "—"}</span>
              <div>
                <strong>{achievement.title}</strong>
                <p>{achievement.description}</p>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

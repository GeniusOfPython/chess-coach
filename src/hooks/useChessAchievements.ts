import { useCallback, useRef, useState } from "react";
import {
  getChessAchievement,
  type ChessAchievement,
  type ChessAchievementId,
  type UnlockedChessAchievement,
} from "../features/chessAchievements";
import { chessAchievementsRepository } from "../repositories/chessAchievementsRepository";

export function useChessAchievements() {
  const [unlocked, setUnlocked] = useState<UnlockedChessAchievement[]>(
    chessAchievementsRepository.load,
  );
  const unlockedRef = useRef(unlocked);

  const unlock = useCallback((ids: ChessAchievementId[]) => {
    const currentIds = new Set(unlockedRef.current.map((item) => item.id));
    const newlyUnlocked: ChessAchievement[] = [];
    const unlockedAt = new Date().toISOString();
    const nextUnlocked = [...unlockedRef.current];

    for (const id of ids) {
      if (currentIds.has(id)) {
        continue;
      }

      const achievement = getChessAchievement(id);

      if (!achievement) {
        continue;
      }

      currentIds.add(id);
      newlyUnlocked.push(achievement);
      nextUnlocked.push({ id, unlockedAt });
    }

    if (newlyUnlocked.length > 0) {
      unlockedRef.current = nextUnlocked;
      setUnlocked(nextUnlocked);
      chessAchievementsRepository.save(nextUnlocked);
    }

    return newlyUnlocked;
  }, []);

  return { unlocked, unlock };
}

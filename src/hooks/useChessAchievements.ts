import { useCallback, useRef, useState } from "react";
import {
  getChessAchievement,
  parseUnlockedAchievements,
  type ChessAchievement,
  type ChessAchievementId,
  type UnlockedChessAchievement,
} from "../features/chessAchievements";
import {
  readJsonStorageValue,
  writeJsonStorageValue,
} from "../platform/appStorage";
import { settingsStorageKeys } from "../platform/storageKeys";

function readUnlockedAchievements() {
  return parseUnlockedAchievements(readJsonStorageValue<unknown>({
    key: settingsStorageKeys.chessAchievements,
    fallback: [],
  }));
}

export function useChessAchievements() {
  const [unlocked, setUnlocked] = useState<UnlockedChessAchievement[]>(
    readUnlockedAchievements,
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
      writeJsonStorageValue(
        settingsStorageKeys.chessAchievements,
        nextUnlocked,
      );
    }

    return newlyUnlocked;
  }, []);

  return { unlocked, unlock };
}

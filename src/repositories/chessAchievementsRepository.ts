import {
  parseUnlockedAchievements,
  type UnlockedChessAchievement,
} from "../features/chessAchievements";
import { settingsStorageKeys } from "../platform/storageKeys";
import {
  localRepositoryStorage,
  readJsonRepositoryValue,
  type RepositoryStorage,
  writeJsonRepositoryValue,
} from "./repositoryStorage";

export function createChessAchievementsRepository(
  storage: RepositoryStorage = localRepositoryStorage,
) {
  return {
    load() {
      return parseUnlockedAchievements(readJsonRepositoryValue<unknown>({
        storage,
        key: settingsStorageKeys.chessAchievements,
        fallback: [],
      }));
    },

    save(achievements: UnlockedChessAchievement[]) {
      writeJsonRepositoryValue(
        storage,
        settingsStorageKeys.chessAchievements,
        achievements,
      );
    },
  };
}

export const chessAchievementsRepository =
  createChessAchievementsRepository();

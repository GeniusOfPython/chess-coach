import { settingsStorageKeys } from "../platform/storageKeys";
import {
  localRepositoryStorage,
  type RepositoryStorage,
} from "./repositoryStorage";

export type StoredTrainingProgress = {
  bestStreak: number;
  totalAttempts: number;
  totalSuccesses: number;
  dailySuccesses: number;
};

function getDayKey(now: Date) {
  return now.toISOString().slice(0, 10);
}

function parseStoredNumber(value: string | null) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

export function createTrainingProgressRepository(
  storage: RepositoryStorage = localRepositoryStorage,
) {
  return {
    load(now = new Date()): StoredTrainingProgress {
      const isCurrentDay = storage.read(settingsStorageKeys.trainingDailyDate) ===
        getDayKey(now);

      return {
        bestStreak: parseStoredNumber(
          storage.read(settingsStorageKeys.trainingBestStreak),
        ),
        totalAttempts: parseStoredNumber(
          storage.read(settingsStorageKeys.trainingTotalAttempts),
        ),
        totalSuccesses: parseStoredNumber(
          storage.read(settingsStorageKeys.trainingTotalSuccesses),
        ),
        dailySuccesses: isCurrentDay
          ? parseStoredNumber(
              storage.read(settingsStorageKeys.trainingDailySuccesses),
            )
          : 0,
      };
    },

    save(progress: StoredTrainingProgress, now = new Date()) {
      storage.write(
        settingsStorageKeys.trainingBestStreak,
        String(progress.bestStreak),
      );
      storage.write(
        settingsStorageKeys.trainingTotalAttempts,
        String(progress.totalAttempts),
      );
      storage.write(
        settingsStorageKeys.trainingTotalSuccesses,
        String(progress.totalSuccesses),
      );
      storage.write(settingsStorageKeys.trainingDailyDate, getDayKey(now));
      storage.write(
        settingsStorageKeys.trainingDailySuccesses,
        String(progress.dailySuccesses),
      );
    },
  };
}

export const trainingProgressRepository =
  createTrainingProgressRepository();

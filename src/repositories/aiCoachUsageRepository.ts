import {
  normalizeAiCoachUsage,
  type AiCoachUsage,
} from "../ai/coachQuota";
import type { AiCoachQuota } from "../features/featureAccess";
import { settingsStorageKeys } from "../platform/storageKeys";
import {
  localRepositoryStorage,
  readJsonRepositoryValue,
  type RepositoryStorage,
  writeJsonRepositoryValue,
} from "./repositoryStorage";

export function createAiCoachUsageRepository(
  storage: RepositoryStorage = localRepositoryStorage,
) {
  function load(quota: AiCoachQuota, now = new Date()) {
    const stored = readJsonRepositoryValue<unknown>({
      storage,
      key: settingsStorageKeys.aiCoachUsage,
      fallback: null,
    });

    return normalizeAiCoachUsage(stored, quota, now);
  }

  return {
    load,

    record(quota: AiCoachQuota, now = new Date()): AiCoachUsage {
      const current = load(quota, now);
      const next = { ...current, count: current.count + 1 };

      writeJsonRepositoryValue(storage, settingsStorageKeys.aiCoachUsage, next);
      return next;
    },
  };
}

export const aiCoachUsageRepository = createAiCoachUsageRepository();

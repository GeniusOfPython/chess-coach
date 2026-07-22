import type {
  SpacedRepetitionItem,
  TrainingThemeId,
} from "../analysis/spacedRepetition";
import { settingsStorageKeys } from "../platform/storageKeys";
import {
  localRepositoryStorage,
  readJsonRepositoryValue,
  type RepositoryStorage,
  writeJsonRepositoryValue,
} from "./repositoryStorage";

const supportedThemes = new Set<TrainingThemeId>([
  "mate",
  "checks",
  "captures",
  "forks",
  "tempo",
  "promotion",
  "king_safety",
  "calculation",
]);
const supportedVerdicts = new Set(["inaccuracy", "mistake", "blunder"]);

function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

function isFiniteNonNegative(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function isStoredItem(value: unknown): value is SpacedRepetitionItem {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<SpacedRepetitionItem>;

  return typeof item.id === "string" &&
    typeof item.positionFen === "string" &&
    typeof item.bestMove === "string" &&
    typeof item.moveNumber === "number" &&
    (item.side === "w" || item.side === "b") &&
    typeof item.playedMove === "string" &&
    supportedVerdicts.has(item.verdict ?? "") &&
    typeof item.evaluationBeforeWhite === "number" &&
    (item.evaluationAfterWhite === null || typeof item.evaluationAfterWhite === "number") &&
    (item.evaluationLoss === null || typeof item.evaluationLoss === "number") &&
    supportedThemes.has(item.theme as TrainingThemeId) &&
    isFiniteNonNegative(item.attempts) &&
    isFiniteNonNegative(item.successes) &&
    isFiniteNonNegative(item.lapses) &&
    isFiniteNonNegative(item.intervalDays) &&
    isIsoDate(item.dueAt) &&
    (item.lastReviewedAt === null || isIsoDate(item.lastReviewedAt)) &&
    (item.reviewHistory === undefined || (
      Array.isArray(item.reviewHistory) && item.reviewHistory.every((record) =>
        Boolean(record) && typeof record === "object" &&
        isIsoDate(record.reviewedAt) && typeof record.independent === "boolean"
      )
    )) &&
    isIsoDate(item.createdAt) &&
    isIsoDate(item.updatedAt);
}

export function createSpacedRepetitionRepository(
  storage: RepositoryStorage = localRepositoryStorage,
) {
  return {
    load(): SpacedRepetitionItem[] {
      const stored = readJsonRepositoryValue<unknown>({
        storage,
        key: settingsStorageKeys.trainingReviewQueue,
        fallback: [],
      });

      if (!Array.isArray(stored)) {
        storage.remove(settingsStorageKeys.trainingReviewQueue);
        return [];
      }

      return stored.filter(isStoredItem).slice(0, 120).map((item) => ({
        ...item,
        reviewHistory: item.reviewHistory ?? [],
      }));
    },

    save(items: SpacedRepetitionItem[]) {
      writeJsonRepositoryValue(
        storage,
        settingsStorageKeys.trainingReviewQueue,
        items.slice(0, 120),
      );
    },

    clear() {
      storage.remove(settingsStorageKeys.trainingReviewQueue);
    },
  };
}

export const spacedRepetitionRepository =
  createSpacedRepetitionRepository();

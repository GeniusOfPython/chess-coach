import {
  readAppStorageEntries,
  removeAppStorageValue,
} from "./appStorage";
import { captureStorageRecovery } from "./diagnostics/crashReporter";
import {
  gameSessionStorageKeys,
  settingsStorageKeys,
} from "./storageKeys";

export type StorageRecoverySummary = {
  removedEntries: number;
  categories: string[];
};

export type StorageHealthInspection = StorageRecoverySummary & {
  invalidKeys: string[];
};

type Validator = (value: string) => boolean;

const oneOf = (...values: string[]): Validator =>
  (value) => values.includes(value);
const integer = (value: string) => /^\d+$/u.test(value);
const isoDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/u.test(value);
const validJson = (value: string) => {
  try {
    JSON.parse(value);
    return true;
  } catch {
    return false;
  }
};

const validators = new Map<string, { category: string; validate: Validator }>([
  [settingsStorageKeys.gameMode, { category: "preferences", validate: oneOf("analysis", "bot") }],
  [settingsStorageKeys.playerSide, { category: "preferences", validate: oneOf("w", "b") }],
  [settingsStorageKeys.botLevelId, { category: "preferences", validate: oneOf("beginner", "casual", "club", "strong", "max") }],
  [settingsStorageKeys.compactUi, { category: "preferences", validate: oneOf("true", "false") }],
  [settingsStorageKeys.showAnalysisArrows, { category: "preferences", validate: oneOf("true", "false") }],
  [settingsStorageKeys.boardTheme, { category: "preferences", validate: oneOf("cyber", "ultraviolet", "sunset") }],
  [settingsStorageKeys.subscriptionTier, { category: "preferences", validate: oneOf("free", "premium") }],
  [settingsStorageKeys.activeWorkspace, { category: "preferences", validate: oneOf("coach", "game", "tools", "none") }],
  [settingsStorageKeys.privacyConsent, { category: "consent", validate: validJson }],
  [settingsStorageKeys.trainingBestStreak, { category: "progress", validate: integer }],
  [settingsStorageKeys.trainingTotalAttempts, { category: "progress", validate: integer }],
  [settingsStorageKeys.trainingTotalSuccesses, { category: "progress", validate: integer }],
  [settingsStorageKeys.trainingDailyDate, { category: "progress", validate: isoDate }],
  [settingsStorageKeys.trainingDailySuccesses, { category: "progress", validate: integer }],
  [settingsStorageKeys.aiCoachUsage, { category: "usage", validate: validJson }],
  [settingsStorageKeys.chessAchievements, { category: "progress", validate: validJson }],
  [gameSessionStorageKeys.botGameStarted, { category: "game", validate: oneOf("true", "false") }],
  [gameSessionStorageKeys.gameTermination, { category: "game", validate: validJson }],
  [gameSessionStorageKeys.gameArchive, { category: "game", validate: validJson }],
]);

function validatorFor(key: string) {
  if (key.startsWith("chess-coach.section.")) {
    return { category: "interface", validate: oneOf("open", "closed") };
  }

  return validators.get(key) ?? null;
}

export function recoverCorruptedAppStorage(): StorageRecoverySummary | null {
  const inspection = inspectAppStorageEntries(readAppStorageEntries());

  if (!inspection) {
    return null;
  }

  inspection.invalidKeys.forEach(removeAppStorageValue);

  const summary = {
    removedEntries: inspection.removedEntries,
    categories: inspection.categories,
  };

  captureStorageRecovery(summary);
  return summary;
}

export function inspectAppStorageEntries(
  entries: Record<string, string>,
): StorageHealthInspection | null {
  const categories: string[] = [];
  const invalidKeys: string[] = [];

  for (const [key, value] of Object.entries(entries)) {
    const rule = validatorFor(key);

    if (!rule || rule.validate(value)) {
      continue;
    }

    invalidKeys.push(key);
    categories.push(rule.category);
  }

  if (invalidKeys.length === 0) {
    return null;
  }

  return {
    removedEntries: invalidKeys.length,
    categories: [...new Set(categories)].sort(),
    invalidKeys: invalidKeys.sort(),
  };
}

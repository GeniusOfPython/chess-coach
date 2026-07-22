import type {
  DiagnosticProfile,
  ExperienceLevel,
  LearningGoal,
} from "../analysis/diagnosticProfile";
import { settingsStorageKeys } from "../platform/storageKeys";
import {
  localRepositoryStorage,
  readJsonRepositoryValue,
  type RepositoryStorage,
} from "./repositoryStorage";

export type OnboardingSnapshot =
  | { version: 1; status: "pending" }
  | { version: 1; status: "skipped" }
  | {
      version: 1;
      status: "diagnostic";
      goal: LearningGoal;
      experience: ExperienceLevel;
      startedAt: string;
    }
  | {
      version: 1;
      status: "complete";
      goal: LearningGoal;
      experience: ExperienceLevel;
      startedAt: string;
      completedAt: string;
      result: DiagnosticProfile;
      resultDismissed: boolean;
    };

const pendingSnapshot: OnboardingSnapshot = { version: 1, status: "pending" };

function isGoal(value: unknown): value is LearningGoal {
  return value === "reduce_mistakes" ||
    value === "understand_positions" ||
    value === "build_habit";
}

function isExperience(value: unknown): value is ExperienceLevel {
  return value === "beginner" || value === "basic" || value === "regular";
}

function isDiagnosticResult(value: unknown): value is DiagnosticProfile {
  if (!value || typeof value !== "object") {
    return false;
  }

  const result = value as Partial<DiagnosticProfile>;
  const validLevels = new Set([
    "foundation",
    "developing",
    "confident",
    "insufficient",
  ]);
  const validBotLevels = new Set([
    "beginner",
    "casual",
    "club",
    "strong",
    "max",
  ]);
  return typeof result.decisionCount === "number" &&
    typeof result.accuracy === "number" &&
    validLevels.has(result.level ?? "") &&
    typeof result.levelLabel === "string" &&
    (typeof result.focusLabel === "string" || result.focusLabel === null) &&
    typeof result.mistakes === "number" &&
    typeof result.blunders === "number" &&
    validBotLevels.has(result.recommendedBotLevel ?? "") &&
    typeof result.summary === "string" &&
    typeof result.nextStep === "string";
}

function parseSnapshot(value: unknown): OnboardingSnapshot {
  if (!value || typeof value !== "object") {
    return pendingSnapshot;
  }

  const snapshot = value as Partial<OnboardingSnapshot> & Record<string, unknown>;

  if (snapshot.version !== 1) {
    return pendingSnapshot;
  }

  if (snapshot.status === "skipped") {
    return { version: 1, status: "skipped" };
  }

  if (
    snapshot.status === "diagnostic" &&
    isGoal(snapshot.goal) &&
    isExperience(snapshot.experience) &&
    typeof snapshot.startedAt === "string"
  ) {
    return {
      version: 1,
      status: "diagnostic",
      goal: snapshot.goal,
      experience: snapshot.experience,
      startedAt: snapshot.startedAt,
    };
  }

  if (
    snapshot.status === "complete" &&
    isGoal(snapshot.goal) &&
    isExperience(snapshot.experience) &&
    typeof snapshot.startedAt === "string" &&
    typeof snapshot.completedAt === "string" &&
    typeof snapshot.resultDismissed === "boolean" &&
    isDiagnosticResult(snapshot.result)
  ) {
    return snapshot as OnboardingSnapshot;
  }

  return pendingSnapshot;
}

export function createOnboardingRepository(
  storage: RepositoryStorage = localRepositoryStorage,
) {
  return {
    load(): OnboardingSnapshot {
      const value = readJsonRepositoryValue({
        storage,
        key: settingsStorageKeys.onboarding,
        fallback: pendingSnapshot,
      });

      return parseSnapshot(value);
    },

    save(snapshot: OnboardingSnapshot) {
      storage.write(settingsStorageKeys.onboarding, JSON.stringify(snapshot));
    },
  };
}

export const onboardingRepository = createOnboardingRepository();

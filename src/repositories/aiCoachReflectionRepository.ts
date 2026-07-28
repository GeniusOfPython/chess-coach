import type { AiCoachRequest } from "../ai/coachContract";
import { createAiCoachAdviceCacheKey } from "./aiCoachAdviceRepository";
import { settingsStorageKeys } from "../platform/storageKeys";
import {
  localRepositoryStorage,
  readJsonRepositoryValue,
  type RepositoryStorage,
  writeJsonRepositoryValue,
} from "./repositoryStorage";

const reflectionsVersion = 1;
const maximumEntries = 40;
export const maximumAiCoachReflectionLength = 500;
export const maximumAiCoachReflectionQuestionLength = 240;

export type AiCoachReflectionPractice = {
  outcome: "verified" | "needs_retry";
  attemptedAt: string;
};

export type AiCoachReflectionEntry = {
  key: string;
  answer: string;
  question: string | null;
  updatedAt: string;
  practice: AiCoachReflectionPractice | null;
};

type ReflectionState = {
  version: typeof reflectionsVersion;
  entries: AiCoachReflectionEntry[];
};

function isPractice(value: unknown): value is AiCoachReflectionPractice {
  return typeof value === "object" && value !== null &&
    "outcome" in value &&
    (value.outcome === "verified" || value.outcome === "needs_retry") &&
    "attemptedAt" in value && typeof value.attemptedAt === "string" &&
    Number.isFinite(Date.parse(value.attemptedAt));
}

function isReflectionEntry(value: unknown): value is AiCoachReflectionEntry {
  return typeof value === "object" && value !== null &&
    "key" in value && typeof value.key === "string" &&
    "answer" in value && typeof value.answer === "string" &&
    "updatedAt" in value && typeof value.updatedAt === "string" &&
    (!('question' in value) || value.question === null || typeof value.question === "string") &&
    (!('practice' in value) || value.practice === null || isPractice(value.practice));
}

function normalizeAnswer(value: string) {
  return value.trim().slice(0, maximumAiCoachReflectionLength);
}

function normalizeQuestion(value: string | null | undefined) {
  return typeof value === "string"
    ? value.trim().slice(0, maximumAiCoachReflectionQuestionLength) || null
    : null;
}

function normalizeEntries(value: unknown) {
  if (
    typeof value !== "object" || value === null ||
    !("version" in value) || value.version !== reflectionsVersion ||
    !("entries" in value) || !Array.isArray(value.entries)
  ) {
    return [];
  }

  return value.entries.flatMap((entry) => {
    if (!isReflectionEntry(entry)) {
      return [];
    }

    const answer = normalizeAnswer(entry.answer);

    if (!answer || !Number.isFinite(Date.parse(entry.updatedAt))) {
      return [];
    }

    return [{
      key: entry.key,
      answer,
      question: normalizeQuestion(entry.question),
      updatedAt: entry.updatedAt,
      practice: isPractice(entry.practice) ? entry.practice : null,
    }];
  });
}

function state(entries: AiCoachReflectionEntry[]): ReflectionState {
  return { version: reflectionsVersion, entries };
}

export function getAiCoachReflectionKey(request: AiCoachRequest) {
  return createAiCoachAdviceCacheKey(request);
}

export function createAiCoachReflectionRepository(
  storage: RepositoryStorage = localRepositoryStorage,
) {
  function loadEntries() {
    const stored = readJsonRepositoryValue<unknown>({
      storage,
      key: settingsStorageKeys.aiCoachReflections,
      fallback: null,
    });
    const entries = normalizeEntries(stored);

    if (
      !stored || typeof stored !== "object" ||
      !("entries" in stored) || !Array.isArray(stored.entries) ||
      stored.entries.length !== entries.length
    ) {
      writeJsonRepositoryValue(storage, settingsStorageKeys.aiCoachReflections, state(entries));
    }

    return entries;
  }

  function saveEntries(entries: AiCoachReflectionEntry[]) {
    writeJsonRepositoryValue(
      storage,
      settingsStorageKeys.aiCoachReflections,
      state(entries),
    );
  }

  return {
    load(request: AiCoachRequest) {
      const key = getAiCoachReflectionKey(request);
      return loadEntries().find((entry) => entry.key === key) ?? null;
    },

    save(request: AiCoachRequest, value: string, {
      question,
      now = new Date(),
    }: {
      question?: string | null;
      now?: Date;
    } = {}) {
      const answer = normalizeAnswer(value);
      const key = getAiCoachReflectionKey(request);
      const entries = loadEntries().filter((entry) => entry.key !== key);

      if (!answer) {
        saveEntries(entries);
        return null;
      }

      const entry: AiCoachReflectionEntry = {
        key,
        answer,
        question: normalizeQuestion(question),
        updatedAt: now.toISOString(),
        practice: null,
      };
      saveEntries([entry, ...entries].slice(0, maximumEntries));
      return entry;
    },

    recordPractice(key: string, solved: boolean, now = new Date()) {
      const entries = loadEntries();
      const entry = entries.find((item) => item.key === key);

      if (!entry) {
        return null;
      }

      const practice: AiCoachReflectionPractice = {
        outcome: solved ? "verified" : "needs_retry",
        attemptedAt: now.toISOString(),
      };
      const nextEntries = entries.map((item) => item.key === key
        ? { ...item, practice }
        : item);
      saveEntries(nextEntries);
      return { ...entry, practice };
    },

    list() {
      return loadEntries();
    },

    remove(key: string) {
      saveEntries(loadEntries().filter((entry) => entry.key !== key));
    },

    clear() {
      saveEntries([]);
    },
  };
}

export const aiCoachReflectionRepository = createAiCoachReflectionRepository();

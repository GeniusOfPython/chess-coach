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

type ReflectionEntry = {
  key: string;
  answer: string;
  updatedAt: string;
};

type ReflectionState = {
  version: typeof reflectionsVersion;
  entries: ReflectionEntry[];
};

function isReflectionEntry(value: unknown): value is ReflectionEntry {
  return typeof value === "object" && value !== null &&
    "key" in value && typeof value.key === "string" &&
    "answer" in value && typeof value.answer === "string" &&
    "updatedAt" in value && typeof value.updatedAt === "string";
}

function normalizeAnswer(value: string) {
  return value.trim().slice(0, maximumAiCoachReflectionLength);
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

    return [{ ...entry, answer }];
  });
}

function state(entries: ReflectionEntry[]): ReflectionState {
  return { version: reflectionsVersion, entries };
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

  function saveEntries(entries: ReflectionEntry[]) {
    writeJsonRepositoryValue(
      storage,
      settingsStorageKeys.aiCoachReflections,
      state(entries),
    );
  }

  return {
    load(request: AiCoachRequest) {
      const key = createAiCoachAdviceCacheKey(request);
      return loadEntries().find((entry) => entry.key === key) ?? null;
    },

    save(request: AiCoachRequest, value: string, now = new Date()) {
      const answer = normalizeAnswer(value);
      const key = createAiCoachAdviceCacheKey(request);
      const entries = loadEntries().filter((entry) => entry.key !== key);

      if (!answer) {
        saveEntries(entries);
        return null;
      }

      const entry = { key, answer, updatedAt: now.toISOString() };
      saveEntries([entry, ...entries].slice(0, maximumEntries));
      return entry;
    },
  };
}

export const aiCoachReflectionRepository = createAiCoachReflectionRepository();

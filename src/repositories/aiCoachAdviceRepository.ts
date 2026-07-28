import {
  aiCoachContractVersion,
  parseAiCoachResponse,
  type AiCoachAdvice,
  type AiCoachRequest,
} from "../ai/coachContract";
import { settingsStorageKeys } from "../platform/storageKeys";
import {
  localRepositoryStorage,
  readJsonRepositoryValue,
  type RepositoryStorage,
  writeJsonRepositoryValue,
} from "./repositoryStorage";

const cacheVersion = 1;
const maximumEntries = 16;
export const aiCoachAdviceCacheTtlMs = 60 * 60 * 1000;

type CacheEntry = {
  key: string;
  storedAt: string;
  advice: unknown;
};

type CacheState = {
  version: typeof cacheVersion;
  entries: CacheEntry[];
};

function isCacheEntry(value: unknown): value is CacheEntry {
  return typeof value === "object" && value !== null &&
    "key" in value && typeof value.key === "string" &&
    "storedAt" in value && typeof value.storedAt === "string" &&
    "advice" in value;
}

function stableHash(value: string, seed: number) {
  let hash = seed;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  return (hash >>> 0).toString(36);
}

export function createAiCoachAdviceCacheKey(request: AiCoachRequest) {
  const serialized = JSON.stringify(request);
  return `${aiCoachContractVersion}-${stableHash(serialized, 0x811c9dc5)}-${
    stableHash(serialized, 0x01000193)
  }`;
}

function normalizeEntries(value: unknown, now: Date) {
  if (
    typeof value !== "object" || value === null ||
    !("version" in value) || value.version !== cacheVersion ||
    !("entries" in value) || !Array.isArray(value.entries)
  ) {
    return [];
  }

  const nowMs = now.getTime();

  return value.entries.filter((entry): entry is CacheEntry => {
    if (!isCacheEntry(entry)) {
      return false;
    }

    const storedAtMs = Date.parse(entry.storedAt);
    return Number.isFinite(storedAtMs) && storedAtMs <= nowMs &&
      nowMs - storedAtMs <= aiCoachAdviceCacheTtlMs;
  });
}

function cacheState(entries: CacheEntry[]): CacheState {
  return { version: cacheVersion, entries };
}

export function createAiCoachAdviceRepository(
  storage: RepositoryStorage = localRepositoryStorage,
) {
  function loadEntries(now: Date) {
    const stored = readJsonRepositoryValue<unknown>({
      storage,
      key: settingsStorageKeys.aiCoachAdviceCache,
      fallback: null,
    });
    const entries = normalizeEntries(stored, now);

    if (
      !stored || typeof stored !== "object" ||
      !("entries" in stored) ||
      !Array.isArray(stored.entries) || stored.entries.length !== entries.length
    ) {
      writeJsonRepositoryValue(storage, settingsStorageKeys.aiCoachAdviceCache, cacheState(entries));
    }

    return entries;
  }

  function saveEntries(entries: CacheEntry[]) {
    writeJsonRepositoryValue(
      storage,
      settingsStorageKeys.aiCoachAdviceCache,
      cacheState(entries),
    );
  }

  return {
    load(request: AiCoachRequest, now = new Date()) {
      const key = createAiCoachAdviceCacheKey(request);
      const entries = loadEntries(now);
      const entry = entries.find((item) => item.key === key);

      if (!entry) {
        return null;
      }

      try {
        return {
          advice: parseAiCoachResponse({
            schemaVersion: aiCoachContractVersion,
            advice: entry.advice,
          }, request).advice,
          storedAt: entry.storedAt,
        };
      } catch {
        saveEntries(entries.filter((item) => item !== entry));
        return null;
      }
    },

    save(request: AiCoachRequest, advice: AiCoachAdvice, now = new Date()) {
      const key = createAiCoachAdviceCacheKey(request);
      const entries = loadEntries(now).filter((item) => item.key !== key);
      const nextEntry: CacheEntry = {
        key,
        storedAt: now.toISOString(),
        advice,
      };

      saveEntries([nextEntry, ...entries].slice(0, maximumEntries));
    },
  };
}

export const aiCoachAdviceRepository = createAiCoachAdviceRepository();

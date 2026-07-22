import {
  reviewCheckpointVersion,
  type ReviewCheckpoint,
} from "../analysis/reviewSession";
import { gameSessionStorageKeys } from "../platform/storageKeys";
import type { EngineAnalysis, EngineLine } from "../types/chess";
import {
  localRepositoryStorage,
  readJsonRepositoryValue,
  type RepositoryStorage,
  writeJsonRepositoryValue,
} from "./repositoryStorage";

const cacheVersion = 1 as const;
const maximumCacheEntries = 96;
const cacheLifetimeMs = 14 * 24 * 60 * 60 * 1000;

type CachedAnalysis = {
  fen: string;
  movetime: number;
  savedAt: number;
  analysis: EngineAnalysis;
};

type ReviewAnalysisCache = {
  version: typeof cacheVersion;
  entries: CachedAnalysis[];
};

function isEngineLine(value: unknown): value is EngineLine {
  if (!value || typeof value !== "object") return false;
  const line = value as Partial<EngineLine>;

  return typeof line.rank === "number" &&
    typeof line.bestMove === "string" &&
    (typeof line.evaluation === "number" || line.evaluation === null) &&
    (typeof line.mate === "number" || line.mate === null) &&
    typeof line.depth === "number" &&
    Array.isArray(line.variation) &&
    line.variation.every((move) => typeof move === "string");
}

function isEngineAnalysis(value: unknown): value is EngineAnalysis {
  if (!isEngineLine(value)) return false;
  const analysis = value as Partial<EngineAnalysis>;
  return Array.isArray(analysis.lines) && analysis.lines.every(isEngineLine);
}

function isCachedAnalysis(
  value: unknown,
  now: number,
): value is CachedAnalysis {
  if (!value || typeof value !== "object") return false;
  const entry = value as Partial<CachedAnalysis>;

  return typeof entry.fen === "string" &&
    typeof entry.movetime === "number" &&
    typeof entry.savedAt === "number" &&
    now - entry.savedAt <= cacheLifetimeMs &&
    isEngineAnalysis(entry.analysis);
}

export function createReviewSessionRepository(
  storage: RepositoryStorage = localRepositoryStorage,
) {
  const readCache = (now = Date.now()) => {
    const stored = readJsonRepositoryValue<Partial<ReviewAnalysisCache>>({
      storage,
      key: gameSessionStorageKeys.reviewAnalysisCache,
      fallback: {},
    });

    if (stored.version !== cacheVersion || !Array.isArray(stored.entries)) {
      return [];
    }

    return stored.entries.filter((entry) => isCachedAnalysis(entry, now));
  };

  const writeCache = (entries: CachedAnalysis[]) => {
    writeJsonRepositoryValue<ReviewAnalysisCache>(
      storage,
      gameSessionStorageKeys.reviewAnalysisCache,
      {
        version: cacheVersion,
        entries: entries
          .sort((left, right) => right.savedAt - left.savedAt)
          .slice(0, maximumCacheEntries),
      },
    );
  };

  return {
    getCachedAnalysis({
      fen,
      movetime,
      now = Date.now(),
    }: {
      fen: string;
      movetime: number;
      now?: number;
    }) {
      const match = readCache(now)
        .filter((entry) => entry.fen === fen && entry.movetime >= movetime)
        .sort((left, right) => right.movetime - left.movetime)[0];

      return match?.analysis ?? null;
    },

    cacheAnalysis({
      fen,
      movetime,
      analysis,
      now = Date.now(),
    }: {
      fen: string;
      movetime: number;
      analysis: EngineAnalysis;
      now?: number;
    }) {
      const currentEntries = readCache(now);
      const strongerEntry = currentEntries.find(
        (entry) => entry.fen === fen && entry.movetime >= movetime,
      );

      if (strongerEntry) return;

      const entries = currentEntries.filter((entry) => entry.fen !== fen);
      entries.push({ fen, movetime, analysis, savedAt: now });
      writeCache(entries);
    },

    readCheckpoint({
      signature,
      total,
    }: {
      signature: string;
      total: number;
    }) {
      const checkpoint = readJsonRepositoryValue<Partial<ReviewCheckpoint>>({
        storage,
        key: gameSessionStorageKeys.reviewCheckpoint,
        fallback: {},
      });

      if (
        checkpoint.version !== reviewCheckpointVersion ||
        checkpoint.signature !== signature ||
        checkpoint.total !== total ||
        typeof checkpoint.nextIndex !== "number" ||
        checkpoint.nextIndex < 0 ||
        checkpoint.nextIndex > total ||
        !Array.isArray(checkpoint.items) ||
        typeof checkpoint.updatedAt !== "number"
      ) {
        return null;
      }

      return checkpoint as ReviewCheckpoint;
    },

    saveCheckpoint(
      checkpoint: Omit<ReviewCheckpoint, "version" | "updatedAt">,
      now = Date.now(),
    ) {
      writeJsonRepositoryValue<ReviewCheckpoint>(
        storage,
        gameSessionStorageKeys.reviewCheckpoint,
        {
          ...checkpoint,
          version: reviewCheckpointVersion,
          updatedAt: now,
        },
      );
    },

    clearCheckpoint() {
      storage.remove(gameSessionStorageKeys.reviewCheckpoint);
    },

    clearAnalysisCache() {
      storage.remove(gameSessionStorageKeys.reviewAnalysisCache);
    },
  };
}

export const reviewSessionRepository = createReviewSessionRepository();

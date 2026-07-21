import type { Color } from "chess.js";
import {
  readJsonStorageValue,
  removeStorageValue,
  writeJsonStorageValue,
} from "../platform/appStorage";
import { gameSessionStorageKeys } from "../platform/storageKeys";
import type { EngineAnalysis, EngineLine } from "../types/chess";
import type { GameReviewItem } from "./gameReview";

const cacheVersion = 1;
const checkpointVersion = 1;
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

export type ReviewCheckpoint = {
  version: typeof checkpointVersion;
  signature: string;
  total: number;
  nextIndex: number;
  items: GameReviewItem[];
  updatedAt: number;
};

type ReviewMove = { from: string; to: string };

function hashText(value: string) {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(36);
}

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

function readCache(now = Date.now()) {
  const stored = readJsonStorageValue<Partial<ReviewAnalysisCache>>({
    key: gameSessionStorageKeys.reviewAnalysisCache,
    fallback: {},
  });

  if (stored.version !== cacheVersion || !Array.isArray(stored.entries)) {
    return [];
  }

  return stored.entries.filter((entry): entry is CachedAnalysis =>
    Boolean(entry) &&
    typeof entry.fen === "string" &&
    typeof entry.movetime === "number" &&
    typeof entry.savedAt === "number" &&
    now - entry.savedAt <= cacheLifetimeMs &&
    isEngineAnalysis(entry.analysis),
  );
}

function writeCache(entries: CachedAnalysis[]) {
  writeJsonStorageValue<ReviewAnalysisCache>(
    gameSessionStorageKeys.reviewAnalysisCache,
    {
      version: cacheVersion,
      entries: entries
        .sort((left, right) => right.savedAt - left.savedAt)
        .slice(0, maximumCacheEntries),
    },
  );
}

export function createReviewSignature({
  fenHistory,
  moveHistory,
  reviewSide,
}: {
  fenHistory: string[];
  moveHistory: ReviewMove[];
  reviewSide?: Color;
}) {
  const moves = moveHistory.map(({ from, to }) => `${from}${to}`).join(",");
  return hashText(`${reviewSide ?? "all"}|${fenHistory.join("|")}|${moves}`);
}

export function getCachedReviewAnalysis({
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
}

export function cacheReviewAnalysis({
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
}

export function readReviewCheckpoint({
  signature,
  total,
}: {
  signature: string;
  total: number;
}) {
  const checkpoint = readJsonStorageValue<Partial<ReviewCheckpoint>>({
    key: gameSessionStorageKeys.reviewCheckpoint,
    fallback: {},
  });

  if (
    checkpoint.version !== checkpointVersion ||
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
}

export function saveReviewCheckpoint(
  checkpoint: Omit<ReviewCheckpoint, "version" | "updatedAt">,
) {
  writeJsonStorageValue<ReviewCheckpoint>(
    gameSessionStorageKeys.reviewCheckpoint,
    {
      ...checkpoint,
      version: checkpointVersion,
      updatedAt: Date.now(),
    },
  );
}

export function clearReviewCheckpoint() {
  removeStorageValue(gameSessionStorageKeys.reviewCheckpoint);
}

export function clearReviewAnalysisCache() {
  removeStorageValue(gameSessionStorageKeys.reviewAnalysisCache);
}

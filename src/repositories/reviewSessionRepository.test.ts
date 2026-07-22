import { describe, expect, it } from "vitest";
import type { EngineAnalysis } from "../types/chess";
import type { RepositoryStorage } from "./repositoryStorage";
import { createReviewSessionRepository } from "./reviewSessionRepository";

function createMemoryStorage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  const storage: RepositoryStorage = {
    read: (key) => values.get(key) ?? null,
    write: (key, value) => values.set(key, value),
    remove: (key) => values.delete(key),
  };

  return { storage, values };
}

const analysis: EngineAnalysis = {
  rank: 1,
  bestMove: "e2e4",
  evaluation: 0.25,
  mate: null,
  depth: 12,
  variation: ["e2e4", "e7e5"],
  lines: [],
};

describe("review session repository", () => {
  it("сохраняет и восстанавливает контрольную точку без смены формата", () => {
    const { storage } = createMemoryStorage();
    const repository = createReviewSessionRepository(storage);

    repository.saveCheckpoint({
      signature: "game-1",
      total: 8,
      nextIndex: 3,
      items: [],
    }, 1_721_648_000_000);

    expect(repository.readCheckpoint({
      signature: "game-1",
      total: 8,
    })).toEqual({
      version: 1,
      signature: "game-1",
      total: 8,
      nextIndex: 3,
      items: [],
      updatedAt: 1_721_648_000_000,
    });
  });

  it("использует достаточный сохранённый анализ и удаляет просроченный", () => {
    const { storage } = createMemoryStorage();
    const repository = createReviewSessionRepository(storage);
    const now = 1_721_648_000_000;

    repository.cacheAnalysis({
      fen: "start",
      movetime: 650,
      analysis,
      now,
    });

    expect(repository.getCachedAnalysis({
      fen: "start",
      movetime: 450,
      now,
    })).toEqual(analysis);
    expect(repository.getCachedAnalysis({
      fen: "start",
      movetime: 650,
      now: now + 15 * 24 * 60 * 60 * 1000,
    })).toBeNull();
  });

  it("очищает повреждённые данные через общий порт", () => {
    const { storage, values } = createMemoryStorage({
      "chess-coach.review-checkpoint": "{broken",
    });
    const repository = createReviewSessionRepository(storage);

    expect(repository.readCheckpoint({
      signature: "game-1",
      total: 8,
    })).toBeNull();
    expect(values.has("chess-coach.review-checkpoint")).toBe(false);
  });
});

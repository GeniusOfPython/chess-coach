import { describe, expect, it } from "vitest";
import type { EngineAnalysis } from "../types/chess";
import { createVerifiedChessFacts } from "../analysis/verifiedChessFacts";
import { createAiCoachRequest } from "../ai/coachContract";
import { settingsStorageKeys } from "../platform/storageKeys";
import {
  createAiCoachReflectionRepository,
  maximumAiCoachReflectionLength,
} from "./aiCoachReflectionRepository";
import type { RepositoryStorage } from "./repositoryStorage";

function createStorage(): RepositoryStorage & { values: Map<string, string> } {
  const values = new Map<string, string>();

  return {
    values,
    read: (key) => values.get(key) ?? null,
    write: (key, value) => values.set(key, value),
    remove: (key) => values.delete(key),
  };
}

const analysis: EngineAnalysis = {
  rank: 1,
  bestMove: "f1b5",
  evaluation: 0.35,
  mate: null,
  depth: 16,
  variation: ["f1b5", "b8c6"],
  lines: [{
    rank: 1,
    bestMove: "f1b5",
    evaluation: 0.35,
    mate: null,
    depth: 16,
    variation: ["f1b5", "b8c6", "e1g1"],
  }],
};

const request = createAiCoachRequest(createVerifiedChessFacts({
  fen: "rn1qkbnr/pppb1ppp/3pp3/8/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 4",
  analysis,
}));

describe("AI Coach reflection repository", () => {
  it("сохраняет мысль только для той же позиции", () => {
    const repository = createAiCoachReflectionRepository(createStorage());
    const now = new Date("2026-07-28T12:00:00.000Z");

    repository.save(request, "Сначала проверю защиту короля.", now);

    expect(repository.load(request)).toEqual({
      answer: "Сначала проверю защиту короля.",
      key: expect.any(String),
      updatedAt: now.toISOString(),
    });
  });

  it("очищает пустую мысль и ограничивает длину ответа", () => {
    const storage = createStorage();
    const repository = createAiCoachReflectionRepository(storage);

    repository.save(request, "x".repeat(maximumAiCoachReflectionLength + 20));
    expect(repository.load(request)?.answer).toHaveLength(maximumAiCoachReflectionLength);

    repository.save(request, "   ");

    expect(repository.load(request)).toBeNull();
    expect(storage.values.get(settingsStorageKeys.aiCoachReflections))
      .toContain('"entries":[]');
  });
});

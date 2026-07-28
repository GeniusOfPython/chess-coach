import { describe, expect, it } from "vitest";
import type { EngineAnalysis } from "../types/chess";
import { createVerifiedChessFacts } from "../analysis/verifiedChessFacts";
import { createAiCoachRequest, type AiCoachAdvice } from "../ai/coachContract";
import {
  aiCoachAdviceCacheTtlMs,
  createAiCoachAdviceRepository,
} from "./aiCoachAdviceRepository";
import type { RepositoryStorage } from "./repositoryStorage";
import { settingsStorageKeys } from "../platform/storageKeys";

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

const advice: AiCoachAdvice = {
  headline: "Развивай фигуры с темпом",
  explanation: "Слон выходит на активную линию и подготавливает рокировку.",
  focusPoints: ["Развитие", "Безопасность короля"],
  warning: null,
  question: "Какой ответ соперника нужно проверить первым?",
  grounding: {
    factIds: ["recommendation.best-move", "move-effect.1"],
    variationId: "variation.1",
  },
};

describe("AI Coach advice repository", () => {
  it("возвращает проверенный сохранённый ответ для той же позиции", () => {
    const storage = createStorage();
    const repository = createAiCoachAdviceRepository(storage);
    const now = new Date("2026-07-28T12:00:00.000Z");

    repository.save(request, advice, now);

    expect(repository.load(request, new Date("2026-07-28T12:30:00.000Z"))).toEqual({
      advice,
      storedAt: now.toISOString(),
    });
  });

  it("удаляет ответ после истечения времени жизни", () => {
    const storage = createStorage();
    const repository = createAiCoachAdviceRepository(storage);
    const now = new Date("2026-07-28T12:00:00.000Z");

    repository.save(request, advice, now);

    expect(repository.load(request, new Date(now.getTime() + aiCoachAdviceCacheTtlMs + 1)))
      .toBeNull();
    expect(storage.values.get(settingsStorageKeys.aiCoachAdviceCache))
      .toContain('"entries":[]');
  });

  it("не использует подменённый ответ из хранилища", () => {
    const storage = createStorage();
    const repository = createAiCoachAdviceRepository(storage);
    const now = new Date("2026-07-28T12:00:00.000Z");

    repository.save(request, { ...advice, explanation: "После e2e4 выигрываем ферзя." }, now);

    expect(repository.load(request, now)).toBeNull();
    expect(storage.values.get(settingsStorageKeys.aiCoachAdviceCache))
      .toContain('"entries":[]');
  });
});

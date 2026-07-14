import { describe, expect, it } from "vitest";
import type { EngineAnalysis } from "../types/chess";
import {
  createAiCoachRequest,
  parseAiCoachResponse,
} from "./coachContract";

const analysis: EngineAnalysis = {
  rank: 1,
  bestMove: "e2e4",
  evaluation: 0.35,
  mate: null,
  depth: 16,
  variation: ["e2e4", "e7e5"],
  lines: Array.from({ length: 5 }, (_, index) => ({
    rank: index + 1,
    bestMove: "e2e4",
    evaluation: 0.35,
    mate: null,
    depth: 16,
    variation: ["e2e4", "e7e5", "invalid", "g1f3"],
  })),
};

describe("createAiCoachRequest", () => {
  it("передаёт только компактный шахматный контекст", () => {
    const request = createAiCoachRequest({
      fen: "rn1qkbnr/pppb1ppp/3pp3/8/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 4",
      analysis,
    });

    expect(request.position.sideToMove).toBe("white");
    expect(request.position.fullMoveNumber).toBe(4);
    expect(request.engine.lines).toHaveLength(3);
    expect(request.engine.lines[0]?.variation).toEqual([
      "e2e4",
      "e7e5",
      "g1f3",
    ]);
    expect(request).not.toHaveProperty("history");
  });

  it("отклоняет некорректный лучший ход", () => {
    expect(() => createAiCoachRequest({
      fen: "start",
      analysis: { ...analysis, bestMove: "invalid" },
    })).toThrow();
  });
});

describe("parseAiCoachResponse", () => {
  const validResponse = {
    schemaVersion: 1,
    advice: {
      headline: "Захвати центр",
      explanation: "Ход e4 открывает линии для фигур.",
      focusPoints: ["Развитие", "Безопасность короля"],
      warning: null,
      question: "Какую фигуру стоит развить следующей?",
    },
  };

  it("принимает ответ по контракту", () => {
    expect(parseAiCoachResponse(validResponse)).toEqual(validResponse);
  });

  it("отклоняет неполный или слишком длинный ответ", () => {
    expect(() => parseAiCoachResponse({})).toThrow("контракту");
    expect(() => parseAiCoachResponse({
      ...validResponse,
      advice: { ...validResponse.advice, focusPoints: [] },
    })).toThrow("ориентиры");
  });
});

import { describe, expect, it } from "vitest";
import type { EngineAnalysis } from "../types/chess";
import { createVerifiedChessFacts } from "../analysis/verifiedChessFacts";
import {
  createAiCoachRequest,
  parseAiCoachResponse,
} from "./coachContract";

const position = "rn1qkbnr/pppb1ppp/3pp3/8/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 4";
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

const facts = createVerifiedChessFacts({ fen: position, analysis });
const request = createAiCoachRequest(facts);

function validResponse() {
  return {
    schemaVersion: 2,
    advice: {
      headline: "Развивай фигуры с темпом",
      explanation: "Слон выходит на активную линию и подготавливает рокировку.",
      focusPoints: ["Развитие", "Безопасность короля"],
      warning: null,
      question: "Какой ответ соперника нужно проверить первым?",
      grounding: {
        factIds: ["recommendation.best-move", "move-effect.1"],
        variationId: "variation.1",
      },
    },
  };
}

describe("createAiCoachRequest", () => {
  it("передаёт единый пакет проверенных фактов", () => {
    expect(request.schemaVersion).toBe(2);
    expect(request.facts.position.sideToMove).toBe("white");
    expect(request.facts.recommendation.bestMove).toBe("f1b5");
    expect(request.facts.variations[0]?.moves).toEqual([
      "f1b5",
      "b8c6",
      "e1g1",
    ]);
    expect(request.facts.facts).toContainEqual(
      expect.objectContaining({ id: "recommendation.best-move" }),
    );
  });
});

describe("parseAiCoachResponse", () => {
  it("принимает ответ со ссылками на проверенные факты", () => {
    expect(parseAiCoachResponse(validResponse(), request)).toEqual(validResponse());
  });

  it("отклоняет неизвестное основание", () => {
    const response = validResponse();
    response.advice.grounding.factIds = [
      "recommendation.best-move",
      "motif.invented",
    ];

    expect(() => parseAiCoachResponse(response, request)).toThrow("не подтверждён");
  });

  it("отклоняет выдуманный вариант", () => {
    const response = validResponse();
    response.advice.explanation = "После f1c4 у белых появляется атака.";

    expect(() => parseAiCoachResponse(response, request)).toThrow(
      "неподтверждённый вариант",
    );
  });

  it("отклоняет ответ без обязательной ссылки на лучший ход", () => {
    const response = validResponse();
    response.advice.grounding.factIds = ["position.phase"];

    expect(() => parseAiCoachResponse(response, request)).toThrow("не подтверждён");
  });
});

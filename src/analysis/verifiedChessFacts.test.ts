import { describe, expect, it } from "vitest";
import type { EngineAnalysis } from "../types/chess";
import {
  createVerifiedChessFacts,
  parseVerifiedChessFacts,
} from "./verifiedChessFacts";

const fen = "rn1qkbnr/pppb1ppp/3pp3/8/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 4";
const analysis: EngineAnalysis = {
  rank: 1,
  bestMove: "f1b5",
  evaluation: 0.42,
  mate: null,
  depth: 18,
  variation: ["f1b5", "b8c6"],
  lines: [{
    rank: 1,
    bestMove: "f1b5",
    evaluation: 0.42,
    mate: null,
    depth: 18,
    variation: ["f1b5", "b8c6", "e1g1"],
  }],
};

describe("verified chess facts", () => {
  it("создаёт канонический пакет из позиции и расчёта", () => {
    const facts = createVerifiedChessFacts({ fen, analysis });

    expect(facts.position).toMatchObject({
      sideToMove: "white",
      phase: "opening",
      fullMoveNumber: 4,
    });
    expect(facts.recommendation.bestMove).toBe("f1b5");
    expect(facts.variations[0]?.moves).toEqual(["f1b5", "b8c6", "e1g1"]);
    expect(parseVerifiedChessFacts(facts)).toEqual(facts);
  });

  it("обрезает вариант на первом нелегальном ходе", () => {
    const facts = createVerifiedChessFacts({
      fen,
      analysis: {
        ...analysis,
        lines: [{
          ...analysis.lines[0]!,
          variation: ["f1b5", "a1a8", "b8c6"],
        }],
      },
    });

    expect(facts.variations[0]?.moves).toEqual(["f1b5"]);
  });

  it("отклоняет подменённый факт", () => {
    const facts = createVerifiedChessFacts({ fen, analysis });
    const tampered = structuredClone(facts);
    tampered.facts[2]!.text = "Лучший ход: a1a8.";

    expect(() => parseVerifiedChessFacts(tampered)).toThrow("не прошли проверку");
  });
});

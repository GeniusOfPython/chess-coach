import { describe, expect, it } from "vitest";
import { analyzeMove } from "./MoveAnalyzer";

const initialFen =
  "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

describe("analyzeMove", () => {
  it("analyzes a legal engine move", () => {
    const result = analyzeMove(initialFen, "e2e4");

    expect(result).toMatchObject({
      isLegal: true,
      from: "e2",
      to: "e4",
      piece: "p",
    });
  });

  it("rejects a malformed engine move without throwing", () => {
    expect(analyzeMove(initialFen, "e2").isLegal).toBe(false);
  });

  it("rejects an invalid position without throwing", () => {
    expect(analyzeMove("invalid-fen", "e2e4").isLegal).toBe(false);
  });
});

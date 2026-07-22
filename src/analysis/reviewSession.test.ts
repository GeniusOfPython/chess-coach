import { describe, expect, it } from "vitest";
import { createReviewSignature } from "./reviewSession";

const game = {
  fenHistory: [
    "start-fen",
    "after-white",
    "after-black",
  ],
  moveHistory: [
    { from: "e2", to: "e4" },
    { from: "e7", to: "e5" },
  ],
};

describe("review session", () => {
  it("creates a stable signature for the same game", () => {
    expect(createReviewSignature(game)).toBe(createReviewSignature({
      fenHistory: [...game.fenHistory],
      moveHistory: game.moveHistory.map((move) => ({ ...move })),
    }));
  });

  it("distinguishes games and review sides", () => {
    const allMoves = createReviewSignature(game);
    const whiteMoves = createReviewSignature({ ...game, reviewSide: "w" });
    const blackMoves = createReviewSignature({ ...game, reviewSide: "b" });
    const anotherGame = createReviewSignature({
      ...game,
      moveHistory: [
        { from: "d2", to: "d4" },
        game.moveHistory[1]!,
      ],
    });

    expect(new Set([
      allMoves,
      whiteMoves,
      blackMoves,
      anotherGame,
    ]).size).toBe(4);
  });
});

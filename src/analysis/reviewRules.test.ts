import { describe, expect, it } from "vitest";
import {
  getFullMoveNumber,
  getTurnFromFen,
  getVerdict,
  isMoveMatchingBestMove,
} from "./reviewRules";

describe("reviewRules", () => {
  it("reads side and full move number from FEN", () => {
    const fen = "8/8/8/8/8/8/8/8 b - - 0 17";

    expect(getTurnFromFen(fen)).toBe("b");
    expect(getFullMoveNumber(fen)).toBe(17);
  });

  it("matches a played promotion-free move against UCI best move", () => {
    expect(
      isMoveMatchingBestMove({
        playedMove: "e2e4",
        bestMove: "e2e4",
      }),
    ).toBe(true);

    expect(
      isMoveMatchingBestMove({
        playedMove: "e2e3",
        bestMove: "e2e4",
      }),
    ).toBe(false);
  });

  it("keeps verdict thresholds deterministic", () => {
    expect(getVerdict({ matchedBestMove: true, evaluationLoss: 0 })).toBe("best");
    expect(getVerdict({ matchedBestMove: false, evaluationLoss: 0.2 })).toBe("good");
    expect(getVerdict({ matchedBestMove: false, evaluationLoss: 0.6 })).toBe("inaccuracy");
    expect(getVerdict({ matchedBestMove: false, evaluationLoss: 1.5 })).toBe("mistake");
    expect(getVerdict({ matchedBestMove: false, evaluationLoss: 1.51 })).toBe("blunder");
    expect(getVerdict({ matchedBestMove: false, evaluationLoss: null })).toBe("unknown");
  });
});

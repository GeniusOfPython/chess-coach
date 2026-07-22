import { describe, expect, it } from "vitest";
import type { GameReviewItem } from "./gameReview";
import {
  buildDiagnosticProfile,
  getDiagnosticBotLevel,
} from "./diagnosticProfile";

const baseItem: GameReviewItem = {
  id: "decision",
  positionFen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
  positionIndex: 0,
  moveNumber: 1,
  side: "w",
  playedMove: "e2e4",
  bestMove: "d2d4",
  verdict: "good",
  evaluationBeforeWhite: 0,
  evaluationAfterWhite: 0,
  evaluationLoss: 0,
  isPlayerDecision: true,
};

describe("diagnostic profile", () => {
  it("selects a safe starting bot from self-reported experience", () => {
    expect(getDiagnosticBotLevel("beginner")).toBe("beginner");
    expect(getDiagnosticBotLevel("basic")).toBe("casual");
    expect(getDiagnosticBotLevel("regular")).toBe("club");
  });

  it("uses only player decisions and avoids a precise conclusion on tiny samples", () => {
    const profile = buildDiagnosticProfile([
      baseItem,
      { ...baseItem, id: "opponent", isPlayerDecision: false, verdict: "blunder" },
    ], "reduce_mistakes");

    expect(profile.decisionCount).toBe(1);
    expect(profile.level).toBe("insufficient");
    expect(profile.blunders).toBe(0);
  });

  it("builds a conservative starting level from reviewed decisions", () => {
    const profile = buildDiagnosticProfile([
      { ...baseItem, id: "1", verdict: "best" },
      { ...baseItem, id: "2", verdict: "good" },
      { ...baseItem, id: "3", verdict: "inaccuracy", evaluationLoss: 0.6 },
      { ...baseItem, id: "4", verdict: "mistake", evaluationLoss: 1.4 },
    ], "understand_positions");

    expect(profile).toMatchObject({
      decisionCount: 4,
      accuracy: 77,
      level: "developing",
      mistakes: 1,
      blunders: 0,
      recommendedBotLevel: "casual",
    });
    expect(profile.focusLabel).toBeTruthy();
    expect(profile.nextStep).toContain("объяснений");
  });
});

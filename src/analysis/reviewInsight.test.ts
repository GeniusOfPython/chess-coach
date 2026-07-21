import { describe, expect, it } from "vitest";
import { buildReviewInsight } from "./reviewInsight";

describe("review insight", () => {
  it("explains a missed forcing motif from the saved position", () => {
    const insight = buildReviewInsight({
      positionFen: "6k1/8/8/8/8/8/7P/R5K1 w - - 0 1",
      side: "w",
      playedMove: "h2h3",
      bestMove: "a1a8",
      evaluationBeforeWhite: 4.2,
      evaluationAfterWhite: -1.1,
      evaluationLoss: 5.3,
    });

    expect(insight.title).toContain("мотив");
    expect(insight.summary).toContain("a1 → a8");
    expect(insight.trainingFocus.length).toBeGreaterThan(20);
  });

  it("falls back to evaluation facts when no tactical motif is detected", () => {
    const insight = buildReviewInsight({
      positionFen: "8/8/8/8/8/8/4K3/6k1 w - - 0 1",
      side: "w",
      playedMove: "e2e3",
      bestMove: null,
      evaluationBeforeWhite: 1.1,
      evaluationAfterWhite: -1,
      evaluationLoss: 2.1,
    });

    expect(insight.title).toBe("Перевес отдан сопернику");
    expect(insight.facts[0]).toContain("сопернику");
  });
});

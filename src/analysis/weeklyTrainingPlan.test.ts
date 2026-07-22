import { describe, expect, it } from "vitest";
import type { SpacedRepetitionItem } from "./spacedRepetition";
import { buildWeeklyTrainingPlan } from "./weeklyTrainingPlan";

function createItem(
  id: string,
  reviewHistory: SpacedRepetitionItem["reviewHistory"] = [],
): SpacedRepetitionItem {
  return {
    id,
    positionFen: "7k/8/8/8/8/8/6Q1/6K1 w - - 0 1",
    bestMove: "g2g7",
    moveNumber: 1,
    side: "w",
    playedMove: "g2g3",
    verdict: "mistake",
    evaluationBeforeWhite: 5,
    evaluationAfterWhite: 0,
    evaluationLoss: 5,
    theme: "calculation",
    attempts: reviewHistory.length,
    successes: reviewHistory.filter(({ independent }) => independent).length,
    lapses: reviewHistory.filter(({ independent }) => !independent).length,
    intervalDays: 1,
    dueAt: "2026-07-22T00:00:00.000Z",
    lastReviewedAt: reviewHistory.at(-1)?.reviewedAt ?? null,
    reviewHistory,
    createdAt: "2026-07-20T00:00:00.000Z",
    updatedAt: "2026-07-22T00:00:00.000Z",
  };
}

describe("weekly training plan", () => {
  it("counts only independent solutions from the current UTC week", () => {
    const plan = buildWeeklyTrainingPlan([
      createItem("one", [
        { reviewedAt: "2026-07-20T12:00:00.000Z", independent: true },
        { reviewedAt: "2026-07-21T12:00:00.000Z", independent: false },
      ]),
      createItem("two", [
        { reviewedAt: "2026-07-12T12:00:00.000Z", independent: true },
      ]),
    ], new Date("2026-07-22T12:00:00.000Z"));

    expect(plan).toMatchObject({
      weekStartsAt: "2026-07-20T00:00:00.000Z",
      target: 2,
      completed: 1,
      progress: 50,
      status: "active",
      focusThemeLabel: "Расчёт вариантов",
    });
  });

  it("marks the plan complete and resets progress in the next week", () => {
    const items = [createItem("one", [
      { reviewedAt: "2026-07-22T12:00:00.000Z", independent: true },
    ])];

    expect(buildWeeklyTrainingPlan(
      items,
      new Date("2026-07-22T13:00:00.000Z"),
    ).status).toBe("complete");
    expect(buildWeeklyTrainingPlan(
      items,
      new Date("2026-07-27T13:00:00.000Z"),
    )).toMatchObject({ completed: 0, status: "active" });
  });

  it("keeps an empty profile free from a fake target", () => {
    expect(buildWeeklyTrainingPlan(
      [],
      new Date("2026-07-22T12:00:00.000Z"),
    )).toMatchObject({ target: 0, completed: 0, status: "empty" });
  });
});

import { describe, expect, it } from "vitest";
import {
  getRemainingAiCoachAdvice,
  normalizeAiCoachUsage,
} from "./coachQuota";

const today = new Date(2026, 6, 14, 12);

describe("AI Coach daily quota", () => {
  it("сохраняет корректное использование текущего дня", () => {
    expect(normalizeAiCoachUsage({ date: "2026-07-14", count: 2 }, today))
      .toEqual({ date: "2026-07-14", count: 2 });
  });

  it("сбрасывает устаревшее или повреждённое значение", () => {
    expect(normalizeAiCoachUsage({ date: "2026-07-13", count: 3 }, today))
      .toEqual({ date: "2026-07-14", count: 0 });
    expect(normalizeAiCoachUsage({ date: "2026-07-14", count: -1 }, today))
      .toEqual({ date: "2026-07-14", count: 0 });
  });

  it("считает остаток Free и не ограничивает Premium", () => {
    const usage = { date: "2026-07-14", count: 2 };

    expect(getRemainingAiCoachAdvice(usage, 3)).toBe(1);
    expect(getRemainingAiCoachAdvice(usage, null)).toBeNull();
  });
});

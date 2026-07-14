import { describe, expect, it } from "vitest";
import {
  getRemainingAiCoachAdvice,
  normalizeAiCoachUsage,
} from "./coachQuota";

const today = new Date(2026, 6, 14, 12);
const dailyQuota = { period: "day", limit: 3 } as const;
const monthlyQuota = { period: "month", limit: 300 } as const;

describe("AI Coach client quota indicator", () => {
  it("сохраняет корректное использование текущего дня", () => {
    expect(normalizeAiCoachUsage(
      { periodKey: "2026-07-14", count: 2 },
      dailyQuota,
      today,
    )).toEqual({ periodKey: "2026-07-14", count: 2 });
  });

  it("сбрасывает устаревшее или повреждённое значение", () => {
    expect(normalizeAiCoachUsage(
      { periodKey: "2026-07-13", count: 3 },
      dailyQuota,
      today,
    )).toEqual({ periodKey: "2026-07-14", count: 0 });
    expect(normalizeAiCoachUsage(
      { periodKey: "2026-07-14", count: -1 },
      dailyQuota,
      today,
    )).toEqual({ periodKey: "2026-07-14", count: 0 });
  });

  it("считает дневной Free и месячный Premium", () => {
    const dailyUsage = { periodKey: "2026-07-14", count: 2 };
    const monthlyUsage = { periodKey: "2026-07", count: 120 };

    expect(getRemainingAiCoachAdvice(dailyUsage, dailyQuota)).toBe(1);
    expect(getRemainingAiCoachAdvice(monthlyUsage, monthlyQuota)).toBe(180);
  });
});

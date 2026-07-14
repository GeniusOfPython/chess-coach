import { describe, expect, it } from "vitest";
import {
  combineCoachQuotaConsumers,
  createMemoryCoachBudget,
} from "./coachBudget";

describe("AI Coach server budget", () => {
  it("ограничивает Free по дням", async () => {
    const consume = createMemoryCoachBudget({
      resolveTier: () => "free",
      freeDailyLimit: 1,
      now: () => new Date("2026-07-14T12:00:00Z"),
    });

    expect(await consume("free-user")).toMatchObject({
      allowed: true,
      remaining: 0,
    });
    expect(await consume("free-user")).toMatchObject({
      allowed: false,
      reason: "daily",
    });
  });

  it("ограничивает Premium по месяцам", async () => {
    const consume = createMemoryCoachBudget({
      resolveTier: () => "premium",
      premiumMonthlyLimit: 1,
      now: () => new Date("2026-07-14T12:00:00Z"),
    });

    expect((await consume("premium-user")).allowed).toBe(true);
    expect(await consume("premium-user")).toMatchObject({
      allowed: false,
      reason: "monthly",
    });
  });

  it("останавливает всех клиентов по общему дневному бюджету", async () => {
    const consume = createMemoryCoachBudget({
      resolveTier: () => "free",
      freeDailyLimit: 10,
      globalDailyLimit: 1,
      now: () => new Date("2026-07-14T12:00:00Z"),
    });

    expect((await consume("client-1")).allowed).toBe(true);
    expect(await consume("client-2")).toMatchObject({
      allowed: false,
      reason: "global",
    });
  });

  it("объединяет burst limit и бюджет", async () => {
    const consume = combineCoachQuotaConsumers(
      () => ({ allowed: true }),
      () => ({ allowed: false, reason: "burst" }),
    );

    await expect(consume("client")).resolves.toEqual({
      allowed: false,
      reason: "burst",
    });
  });
});

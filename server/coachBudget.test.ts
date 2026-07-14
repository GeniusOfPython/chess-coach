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

  it("возвращает резерв при ошибке провайдера", async () => {
    const consume = createMemoryCoachBudget({
      resolveTier: () => "free",
      freeDailyLimit: 1,
      now: () => new Date("2026-07-14T12:00:00Z"),
    });
    const reservation = await consume("free-user");

    expect(reservation.quota).toMatchObject({ remaining: 0, limit: 1 });
    await reservation.release?.();

    expect(await consume("free-user")).toMatchObject({
      allowed: true,
      remaining: 0,
    });
  });

  it("освобождает ранние резервы, если следующий ограничитель отказал", async () => {
    let released = 0;
    const consume = combineCoachQuotaConsumers(
      () => ({
        allowed: true,
        release: () => {
          released += 1;
        },
      }),
      () => ({ allowed: false, reason: "burst" }),
    );

    await expect(consume("client")).resolves.toMatchObject({
      allowed: false,
      reason: "burst",
    });
    expect(released).toBe(1);
  });
});

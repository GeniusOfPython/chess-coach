import { describe, expect, it } from "vitest";
import {
  createMemoryCoachCostController,
  resolveCoachCostSettings,
} from "./coachCostController";

describe("AI Coach cost controller", () => {
  it("резервирует стоимость параллельных запросов и останавливает перерасход", () => {
    const controller = createMemoryCoachCostController({
      dailyBudgetUsd: 0.02,
      inputUsdPerMillion: 1,
      outputUsdPerMillion: 10,
      reservedInputTokens: 5_000,
      reservedOutputTokens: 500,
    });

    const first = controller.tryStart();
    const second = controller.tryStart();
    const third = controller.tryStart();

    expect(first).toBeTruthy();
    expect(second).toBeTruthy();
    expect(third).toBeNull();
    expect(controller.getSnapshot().reservedUsd).toBeCloseTo(0.02);
  });

  it("заменяет резерв фактической стоимостью токенов", () => {
    const controller = createMemoryCoachCostController({
      dailyBudgetUsd: 1,
      inputUsdPerMillion: 2,
      outputUsdPerMillion: 10,
      reservedInputTokens: 20_000,
      reservedOutputTokens: 450,
    });
    const reservation = controller.tryStart();

    expect(reservation).toBeTruthy();
    controller.complete(reservation as string, {
      inputTokens: 1_000,
      outputTokens: 200,
    });

    expect(controller.getSnapshot()).toMatchObject({
      inputTokens: 1_000,
      outputTokens: 200,
      reservedUsd: 0,
      spentUsd: 0.004,
    });
  });

  it("освобождает резерв при сетевой ошибке и сбрасывается на новый день", () => {
    let currentDate = new Date("2026-07-14T10:00:00Z");
    const controller = createMemoryCoachCostController({
      dailyBudgetUsd: 1,
      inputUsdPerMillion: 1,
      outputUsdPerMillion: 5,
      reservedInputTokens: 20_000,
      reservedOutputTokens: 450,
      now: () => currentDate,
    });
    const cancelled = controller.tryStart();
    controller.cancel(cancelled as string);
    expect(controller.getSnapshot().reservedUsd).toBe(0);

    const completed = controller.tryStart();
    controller.complete(completed as string, {
      inputTokens: 2_000,
      outputTokens: 100,
    });
    expect(controller.getSnapshot().spentUsd).toBeGreaterThan(0);

    currentDate = new Date("2026-07-15T01:00:00Z");
    expect(controller.getSnapshot()).toMatchObject({
      spentUsd: 0,
      inputTokens: 0,
      outputTokens: 0,
    });
  });

  it("использует безопасные значения при ошибках конфигурации", () => {
    expect(resolveCoachCostSettings({
      AI_COACH_DAILY_BUDGET_USD: "invalid",
      AI_COACH_INPUT_USD_PER_MILLION: "0.75",
      AI_COACH_OUTPUT_USD_PER_MILLION: "4.5",
    })).toEqual({
      dailyBudgetUsd: 1,
      inputUsdPerMillion: 0.75,
      outputUsdPerMillion: 4.5,
      reservedInputTokens: 20_000,
      reservedOutputTokens: 450,
    });
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createProductEvent,
  setProductAnalyticsProvider,
  trackProductEvent,
} from "./analyticsClient";

afterEach(() => setProductAnalyticsProvider(null));

describe("product analytics", () => {
  it("создаёт версионированное типизированное событие", () => {
    expect(createProductEvent("training_attempted", {
      source: "game_review",
      solved: true,
      hintLevel: 0,
      sequenceIndex: 1,
      sequenceTotal: 3,
    }, "2026-07-21T12:00:00.000Z")).toEqual({
      schemaVersion: 1,
      name: "training_attempted",
      occurredAt: "2026-07-21T12:00:00.000Z",
      properties: {
        source: "game_review",
        solved: true,
        hintLevel: 0,
        sequenceIndex: 1,
        sequenceTotal: 3,
      },
    });
  });

  it("не отправляет события без подключённого провайдера", () => {
    expect(() => trackProductEvent("review_started", {
      mode: "bot",
      totalPositions: 18,
    })).not.toThrow();
  });

  it("передаёт событие подключённому провайдеру", () => {
    const capture = vi.fn();
    setProductAnalyticsProvider({ capture });

    trackProductEvent("ai_coach_requested", {
      tier: "premium",
      remainingBeforeRequest: 42,
    });

    expect(capture).toHaveBeenCalledOnce();
    expect(capture.mock.calls[0]?.[0]).toMatchObject({
      name: "ai_coach_requested",
      properties: { tier: "premium", remainingBeforeRequest: 42 },
    });
  });

  it("отклоняет несогласованные поля с шахматными данными", () => {
    expect(() => createProductEvent("review_started", {
      mode: "analysis",
      totalPositions: 12,
      fen: "8/8/8/8/8/8/8/8 w - - 0 1",
    } as never)).toThrow("запрещённое поле fen");
  });

  it("изолирует синхронный сбой провайдера", () => {
    setProductAnalyticsProvider({
      capture: () => {
        throw new Error("provider failed");
      },
    });

    expect(() => trackProductEvent("game_started", {
      mode: "bot",
      playerSide: "w",
      botLevel: "casual",
    })).not.toThrow();
  });
});

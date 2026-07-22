import { describe, expect, it } from "vitest";
import { featureAccess, getFeatureAccess } from "./featureAccess";

describe("feature access", () => {
  it("использует Free как безопасное состояние по умолчанию", () => {
    expect(featureAccess.tier).toBe("free");
    expect(featureAccess.canUseMoveReview).toBe(false);
    expect(featureAccess.canUseMoveExplanations).toBe(false);
    expect(featureAccess.canUsePgnTools).toBe(true);
    expect(featureAccess.canUseFenTools).toBe(true);
  });

  it("Premium расширяет обучение и скрывает рекламу, но не блокирует базовые инструменты Free", () => {
    const premium = getFeatureAccess("premium");
    const free = getFeatureAccess("free");

    expect(premium.canUseMoveReview).toBe(true);
    expect(premium.canUseMoveExplanations).toBe(true);
    expect(premium.canShowAds).toBe(false);
    expect(free.canShowAds).toBe(true);
    expect(free.canUsePgnTools).toBe(true);
    expect(free.canUseFenTools).toBe(true);
  });
});

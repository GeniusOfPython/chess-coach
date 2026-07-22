import { describe, expect, it, vi } from "vitest";
import {
  createPurchaseProvider,
  parseSubscriptionOffers,
} from "./purchaseProvider";

describe("purchase provider", () => {
  it("принимает только полные предложения и удаляет дубликаты", () => {
    expect(parseSubscriptionOffers([
      {
        productId: "premium.monthly",
        title: "Premium на месяц",
        description: "Ежемесячная подписка",
        price: "499 ₽",
        period: "month",
      },
      {
        productId: "premium.monthly",
        title: "Дубликат",
        description: "Не должен попасть в результат",
        price: "999 ₽",
        period: "month",
      },
      { productId: "broken" },
    ])).toEqual([{
      productId: "premium.monthly",
      title: "Premium на месяц",
      description: "Ежемесячная подписка",
      price: "499 ₽",
      period: "month",
    }]);
  });

  it("делегирует покупку нативному мосту без знания product ID в UI", async () => {
    const purchase = vi.fn(async () => ({ kind: "free" }));
    const provider = createPurchaseProvider(() => ({
      getCurrentEntitlement: async () => ({ kind: "free" }),
      getOfferings: async () => [],
      purchase,
      restorePurchases: async () => ({ kind: "free" }),
    }));

    expect(provider.available).toBe(true);
    expect(provider.canPurchase).toBe(true);
    await provider.purchase("premium.annual");
    expect(purchase).toHaveBeenCalledWith({ productId: "premium.annual" });
  });
});

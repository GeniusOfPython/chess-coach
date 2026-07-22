import type {
  SubscriptionOffer,
  SubscriptionPeriod,
} from "../../types/entitlement";

export type PurchaseProvider = {
  readonly available: boolean;
  readonly canPurchase: boolean;
  readonly canManageSubscription: boolean;
  getCurrentEntitlement(): Promise<unknown>;
  getOfferings(): Promise<SubscriptionOffer[]>;
  purchase(productId: string): Promise<unknown>;
  restorePurchases(): Promise<unknown>;
  openSubscriptionManagement(): Promise<void>;
};

export type NativePurchaseBridge = {
  getCurrentEntitlement?: () => Promise<unknown>;
  getOfferings?: () => Promise<unknown>;
  purchase?: (options: { productId: string }) => Promise<unknown>;
  restorePurchases?: () => Promise<unknown>;
  openSubscriptionManagement?: () => Promise<void>;
};

const subscriptionPeriods = new Set<SubscriptionPeriod>(["month", "year"]);

function cleanText(value: unknown, maximumLength: number) {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim().slice(0, maximumLength)
    : null;
}

export function parseSubscriptionOffers(value: unknown): SubscriptionOffer[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const offers = value.flatMap((candidate) => {
    if (typeof candidate !== "object" || candidate === null) {
      return [];
    }

    const productId = "productId" in candidate
      ? cleanText(candidate.productId, 160)
      : null;
    const title = "title" in candidate
      ? cleanText(candidate.title, 80)
      : null;
    const description = "description" in candidate
      ? cleanText(candidate.description, 180)
      : null;
    const price = "price" in candidate
      ? cleanText(candidate.price, 40)
      : null;
    const period = "period" in candidate &&
        typeof candidate.period === "string" &&
        subscriptionPeriods.has(candidate.period as SubscriptionPeriod)
      ? candidate.period as SubscriptionPeriod
      : null;

    if (!productId || !title || !description || !price || !period) {
      return [];
    }

    return [{ productId, title, description, price, period }];
  });

  const seenProductIds = new Set<string>();
  return offers.filter((offer) => {
    if (seenProductIds.has(offer.productId)) {
      return false;
    }

    seenProductIds.add(offer.productId);
    return true;
  });
}

function readNativePurchaseBridge() {
  return (window as Window & {
    ChessCoachPurchases?: NativePurchaseBridge;
  }).ChessCoachPurchases;
}

export function createPurchaseProvider(
  getBridge: () => NativePurchaseBridge | undefined = readNativePurchaseBridge,
): PurchaseProvider {
  return {
    get available() {
      const bridge = getBridge();
      return Boolean(
        bridge?.getCurrentEntitlement && bridge.restorePurchases,
      );
    },

    get canPurchase() {
      const bridge = getBridge();
      return Boolean(bridge?.getOfferings && bridge.purchase);
    },

    get canManageSubscription() {
      return Boolean(getBridge()?.openSubscriptionManagement);
    },

    async getCurrentEntitlement() {
      const bridge = getBridge();

      if (!bridge?.getCurrentEntitlement) {
        throw new Error("Purchase provider is unavailable");
      }

      return bridge.getCurrentEntitlement();
    },

    async getOfferings() {
      const bridge = getBridge();

      if (!bridge?.getOfferings) {
        throw new Error("Purchase offerings are unavailable");
      }

      return parseSubscriptionOffers(await bridge.getOfferings());
    },

    async purchase(productId) {
      const bridge = getBridge();

      if (!bridge?.purchase) {
        throw new Error("Purchases are unavailable");
      }

      return bridge.purchase({ productId });
    },

    async restorePurchases() {
      const bridge = getBridge();

      if (!bridge?.restorePurchases) {
        throw new Error("Purchase provider is unavailable");
      }

      return bridge.restorePurchases();
    },

    async openSubscriptionManagement() {
      const bridge = getBridge();

      if (!bridge?.openSubscriptionManagement) {
        throw new Error("Subscription management is unavailable");
      }

      await bridge.openSubscriptionManagement();
    },
  };
}

export const purchaseProvider = createPurchaseProvider();

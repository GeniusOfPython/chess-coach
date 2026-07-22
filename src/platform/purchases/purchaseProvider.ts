export type PurchaseProvider = {
  available: boolean;
  getCurrentEntitlement(): Promise<unknown>;
  restorePurchases(): Promise<unknown>;
};

type NativePurchaseBridge = {
  getCurrentEntitlement?: () => Promise<unknown>;
  restorePurchases?: () => Promise<unknown>;
};

function getNativePurchaseBridge() {
  return (window as Window & {
    ChessCoachPurchases?: NativePurchaseBridge;
  }).ChessCoachPurchases;
}

export const purchaseProvider: PurchaseProvider = {
  get available() {
    const bridge = getNativePurchaseBridge();
    return Boolean(
      bridge?.getCurrentEntitlement && bridge.restorePurchases,
    );
  },

  async getCurrentEntitlement() {
    const bridge = getNativePurchaseBridge();

    if (!bridge?.getCurrentEntitlement) {
      throw new Error("Purchase provider is unavailable");
    }

    return bridge.getCurrentEntitlement();
  },

  async restorePurchases() {
    const bridge = getNativePurchaseBridge();

    if (!bridge?.restorePurchases) {
      throw new Error("Purchase provider is unavailable");
    }

    return bridge.restorePurchases();
  },
};

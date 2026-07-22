export type SubscriptionTier = "free" | "premium";

export type EntitlementKind = "free" | "premium" | "temporary";

export type EntitlementSource =
  | "none"
  | "app_store"
  | "play_store"
  | "web"
  | "trial"
  | "promotion";

export type EntitlementVerificationMode = "online" | "offline";

export type EntitlementSnapshot = {
  version: 2;
  kind: EntitlementKind;
  source: EntitlementSource;
  expiresAt: string | null;
  verifiedAt: string | null;
  verificationMode: EntitlementVerificationMode | null;
  autoRenews: boolean;
};

export type EntitlementAccessStatus =
  | "free"
  | "verified"
  | "offline_grace"
  | "unverified"
  | "stale";

export type EntitlementVerificationStatus =
  | "checking"
  | "ready"
  | "unavailable"
  | "error";

export type PurchaseRestoreStatus =
  | "idle"
  | "restoring"
  | "restored"
  | "not_found"
  | "error";

export type SubscriptionPeriod = "month" | "year";

export type SubscriptionOffer = {
  productId: string;
  title: string;
  description: string;
  price: string;
  period: SubscriptionPeriod;
};

export type PurchaseOffersStatus =
  | "idle"
  | "loading"
  | "ready"
  | "empty"
  | "error";

export type PurchaseStatus =
  | "idle"
  | "purchasing"
  | "purchased"
  | "error";

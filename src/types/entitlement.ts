export type SubscriptionTier = "free" | "premium";

export type EntitlementKind = "free" | "premium" | "temporary";

export type EntitlementSource =
  | "none"
  | "app_store"
  | "play_store"
  | "web"
  | "trial"
  | "promotion";

export type EntitlementSnapshot = {
  version: 1;
  kind: EntitlementKind;
  source: EntitlementSource;
  expiresAt: string | null;
  verifiedAt: string | null;
  autoRenews: boolean;
};

export type PurchaseRestoreStatus =
  | "idle"
  | "restoring"
  | "restored"
  | "not_found"
  | "error";

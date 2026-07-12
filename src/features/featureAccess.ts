export type SubscriptionTier = "free" | "premium";

export type PremiumFeatureKey =
  | "moveReview"
  | "moveExplanations"
  | "pgnTools"
  | "fenTools";

export type FeatureAccess = {
  tier: SubscriptionTier;
  canShowAds: boolean;
  canUseMoveReview: boolean;
  canUseMoveExplanations: boolean;
  canUsePgnTools: boolean;
  canUseFenTools: boolean;
};

export function getFeatureAccess(
  tier: SubscriptionTier,
): FeatureAccess {
  const isPremium = tier === "premium";

  return {
    tier,
    canShowAds: !isPremium,
    canUseMoveReview: isPremium,
    canUseMoveExplanations: isPremium,
    canUsePgnTools: true,
    canUseFenTools: true,
  };
}

export const featureAccess = getFeatureAccess("premium");

export function isPremiumFeature(
  featureKey: PremiumFeatureKey,
) {
  return (
    featureKey === "moveReview" ||
    featureKey === "moveExplanations"
  );
}

export function getPremiumFeatureTitle(
  featureKey: PremiumFeatureKey,
) {
  if (featureKey === "moveReview") {
    return "Разбор хода с оценкой";
  }

  if (featureKey === "moveExplanations") {
    return "Пояснения к ходам";
  }

  if (featureKey === "fenTools") {
    return "FEN-инструменты";
  }

  return "PGN-инструменты";
}

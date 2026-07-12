export type SubscriptionTier = "free" | "premium";

export type PremiumFeatureKey =
  | "moveReview"
  | "moveExplanations"
  | "pgnTools"
  | "fenTools";

const DEVELOPMENT_TIER: SubscriptionTier = "premium";

export const featureAccess = {
  tier: DEVELOPMENT_TIER,
  canUseMoveReview: DEVELOPMENT_TIER === "premium",
  canUseMoveExplanations: DEVELOPMENT_TIER === "premium",
  canUsePgnTools: true,
  canUseFenTools: true,
} as const;

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

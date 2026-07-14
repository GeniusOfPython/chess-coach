export type SubscriptionTier = "free" | "premium";

export const freeAiCoachDailyLimit = 3;

export type PremiumFeatureKey =
  | "moveReview"
  | "moveExplanations"
  | "aiCoach"
  | "pgnTools"
  | "fenTools";

export type FeatureAccess = {
  tier: SubscriptionTier;
  canShowAds: boolean;
  canUseMoveReview: boolean;
  canUseMoveExplanations: boolean;
  canUsePgnTools: boolean;
  canUseFenTools: boolean;
  aiCoachDailyLimit: number | null;
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
    aiCoachDailyLimit: isPremium ? null : freeAiCoachDailyLimit,
  };
}

export const featureAccess = getFeatureAccess("premium");

export function isPremiumFeature(
  featureKey: PremiumFeatureKey,
) {
  return (
    featureKey === "moveReview" ||
    featureKey === "moveExplanations" ||
    featureKey === "aiCoach"
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

  if (featureKey === "aiCoach") {
    return "ИИ-тренер без лимита";
  }

  if (featureKey === "fenTools") {
    return "FEN-инструменты";
  }

  return "PGN-инструменты";
}

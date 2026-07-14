export type SubscriptionTier = "free" | "premium";

export const freeAiCoachDailyLimit = 3;
export const premiumAiCoachMonthlyLimit = 300;

export type AiCoachQuota = {
  period: "day" | "month";
  limit: number;
};

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
  aiCoachQuota: AiCoachQuota;
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
    aiCoachQuota: isPremium
      ? { period: "month", limit: premiumAiCoachMonthlyLimit }
      : { period: "day", limit: freeAiCoachDailyLimit },
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
    return "Расширенная квота ИИ-тренера";
  }

  if (featureKey === "fenTools") {
    return "FEN-инструменты";
  }

  return "PGN-инструменты";
}

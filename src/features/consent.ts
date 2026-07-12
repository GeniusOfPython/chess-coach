export type AdsConsentStatus =
  | "unknown"
  | "personalized"
  | "nonPersonalized"
  | "declined";

export type PrivacyConsentState = {
  ads: AdsConsentStatus;
  updatedAt: string | null;
};

export const defaultPrivacyConsent: PrivacyConsentState = {
  ads: "unknown",
  updatedAt: null,
};

export function createPrivacyConsent(
  ads: AdsConsentStatus,
): PrivacyConsentState {
  return {
    ads,
    updatedAt: new Date().toISOString(),
  };
}

export function canRequestAds(
  consent: PrivacyConsentState,
) {
  return (
    consent.ads === "personalized" ||
    consent.ads === "nonPersonalized"
  );
}

export function canRequestPersonalizedAds(
  consent: PrivacyConsentState,
) {
  return consent.ads === "personalized";
}

export function parsePrivacyConsent(
  rawValue: string | null,
): PrivacyConsentState {
  if (!rawValue) {
    return defaultPrivacyConsent;
  }

  try {
    const parsed = JSON.parse(rawValue) as Partial<PrivacyConsentState>;

    if (
      parsed.ads === "unknown" ||
      parsed.ads === "personalized" ||
      parsed.ads === "nonPersonalized" ||
      parsed.ads === "declined"
    ) {
      return {
        ads: parsed.ads,
        updatedAt:
          typeof parsed.updatedAt === "string"
            ? parsed.updatedAt
            : null,
      };
    }
  } catch {
    return defaultPrivacyConsent;
  }

  return defaultPrivacyConsent;
}

export function getAdsConsentLabel(
  consent: PrivacyConsentState,
) {
  if (consent.ads === "personalized") {
    return "Персонализированная реклама разрешена";
  }

  if (consent.ads === "nonPersonalized") {
    return "Только неперсонализированная реклама";
  }

  if (consent.ads === "declined") {
    return "Реклама отключена до изменения согласия";
  }

  return "Согласие на рекламу ещё не выбрано";
}

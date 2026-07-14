import {
  canRequestAds,
  canRequestPersonalizedAds,
  type PrivacyConsentState,
} from "../features/consent";
import type { SubscriptionTier } from "../features/featureAccess";

type AdPlacement = "sidePanel" | "analysis";

type Props = {
  tier: SubscriptionTier;
  placement: AdPlacement;
  consent: PrivacyConsentState;
};

const placementText: Record<AdPlacement, string> = {
  sidePanel: "Спонсорский материал",
  analysis: "Рекомендация партнёра",
};

export default function AdSlot({
  tier,
  placement,
  consent,
}: Props) {
  if (tier === "premium") {
    return null;
  }

  if (!canRequestAds(consent)) {
    return (
      <div
        className="ad-slot ad-slot-disabled"
        aria-label="Рекламный блок отключён"
      >
        <div>
          <span className="ad-slot-label">
            Реклама скрыта
          </span>
          <strong>{placementText[placement]}</strong>
          <p>
            Настройки конфиденциальности можно изменить в разделе «Ещё».
          </p>
        </div>
      </div>
    );
  }

  const isPersonalized = canRequestPersonalizedAds(consent);

  return (
    <div className="ad-slot" aria-label="Рекламный блок">
      <div>
        <span className="ad-slot-label">Реклама</span>
        <strong>{placementText[placement]}</strong>
        <p>
          Показ учитывает выбранные настройки конфиденциальности: {" "}
          {isPersonalized
            ? "персонализированная реклама"
            : "неперсонализированная реклама"}
          .
        </p>
      </div>
    </div>
  );
}

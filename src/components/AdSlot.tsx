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
  sidePanel: "Баннер в правой панели",
  analysis: "Рекламная вставка в учебном разделе",
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
            Реклама отключена
          </span>
          <strong>{placementText[placement]}</strong>
          <p>
            В бесплатной версии здесь будет рекламный блок, но
            сейчас показ рекламы заблокирован до выбора согласия в
            приложении.
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
          Здесь будет подключаться рекламный SDK в бесплатной
          мобильной версии. Тип запроса: {" "}
          {isPersonalized
            ? "персонализированная реклама"
            : "неперсонализированная реклама"}
          .
        </p>
      </div>
    </div>
  );
}

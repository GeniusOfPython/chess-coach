import {
  type AdsConsentStatus,
  type PrivacyConsentState,
} from "../features/consent";
import type { SubscriptionTier } from "../features/featureAccess";

type Props = {
  tier: SubscriptionTier;
  consent: PrivacyConsentState;
  onChange: (status: AdsConsentStatus) => void;
};

export default function ConsentBanner({
  tier,
  consent,
  onChange,
}: Props) {
  if (tier === "premium" || consent.ads !== "unknown") {
    return null;
  }

  return (
    <section className="consent-banner">
      <div>
        <span className="consent-kicker">
          Бесплатная версия
        </span>

        <strong>
          Подготовка согласия на рекламу
        </strong>

        <p>
          В будущей мобильной версии реклама будет показываться
          только после выбора варианта согласия. Сейчас это
          тестовая заглушка без подключения рекламного SDK.
        </p>
      </div>

      <div className="consent-actions">
        <button
          type="button"
          className="consent-primary"
          onClick={() => onChange("personalized")}
        >
          Разрешить персонализированную
        </button>

        <button
          type="button"
          onClick={() => onChange("nonPersonalized")}
        >
          Только обычную
        </button>

        <button
          type="button"
          className="consent-muted"
          onClick={() => onChange("declined")}
        >
          Не показывать
        </button>
      </div>
    </section>
  );
}

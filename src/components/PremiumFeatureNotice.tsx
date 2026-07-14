import {
  getPremiumFeatureTitle,
  type PremiumFeatureKey,
} from "../features/featureAccess";
import "./PremiumFeatureNotice.css";

type Props = {
  featureKey: PremiumFeatureKey;
  description?: string;
};

export default function PremiumFeatureNotice({
  featureKey,
  description,
}: Props) {
  return (
    <div className="premium-notice">
      <span className="premium-badge">Premium</span>

      <strong>{getPremiumFeatureTitle(featureKey)}</strong>

      <p>
        {description ??
          "Доступно в Premium. Подписка открывает расширенный разбор, персональные тренировки и дополнительные инструменты."}
      </p>
    </div>
  );
}

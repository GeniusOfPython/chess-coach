import type { SubscriptionTier } from "../features/featureAccess";

type AdPlacement = "sidePanel" | "analysis";

type Props = {
  tier: SubscriptionTier;
  placement: AdPlacement;
};

const placementText: Record<AdPlacement, string> = {
  sidePanel: "Баннер в правой панели",
  analysis: "Рекламная вставка в учебном разделе",
};

export default function AdSlot({ tier, placement }: Props) {
  if (tier === "premium") {
    return null;
  }

  return (
    <div className="ad-slot" aria-label="Рекламный блок">
      <div>
        <span className="ad-slot-label">Реклама</span>
        <strong>{placementText[placement]}</strong>
        <p>
          Здесь будет подключаться рекламный SDK в бесплатной
          мобильной версии. В премиум-версии этот блок не
          отображается.
        </p>
      </div>
    </div>
  );
}

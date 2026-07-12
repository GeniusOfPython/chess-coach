import type { SubscriptionTier } from "../features/featureAccess";

type Props = {
  compactUi: boolean;
  showAnalysisArrows: boolean;
  subscriptionTier: SubscriptionTier;
  onCompactUiChange: (enabled: boolean) => void;
  onShowAnalysisArrowsChange: (enabled: boolean) => void;
  onSubscriptionTierChange: (tier: SubscriptionTier) => void;
};

export default function AppSettingsPanel({
  compactUi,
  showAnalysisArrows,
  subscriptionTier,
  onCompactUiChange,
  onShowAnalysisArrowsChange,
  onSubscriptionTierChange,
}: Props) {
  return (
    <div className="app-settings-card">
      <div className="setting-row">
        <div>
          <strong>Компактный интерфейс</strong>
          <p>
            Уменьшает отступы и высоту карточек. Удобно для телефона
            и небольшого экрана.
          </p>
        </div>

        <label className="setting-switch">
          <input
            type="checkbox"
            checked={compactUi}
            onChange={(event) =>
              onCompactUiChange(event.target.checked)
            }
          />
          <span />
        </label>
      </div>

      <div className="setting-row">
        <div>
          <strong>Стрелки анализа</strong>
          <p>
            Показывает лучший ход и альтернативы стрелками на доске.
            Можно отключить, если они мешают думать самому.
          </p>
        </div>

        <label className="setting-switch">
          <input
            type="checkbox"
            checked={showAnalysisArrows}
            onChange={(event) =>
              onShowAnalysisArrowsChange(event.target.checked)
            }
          />
          <span />
        </label>
      </div>

      <div className="setting-row subscription-row">
        <div>
          <strong>Режим монетизации</strong>
          <p>
            Тестовый переключатель для будущих Android/iOS версий:
            в бесплатном режиме показываются рекламные места, в
            премиум-режиме реклама скрыта и доступны учебные
            премиум-функции.
          </p>
        </div>

        <div className="subscription-toggle">
          <button
            type="button"
            className={
              subscriptionTier === "free"
                ? "subscription-option active"
                : "subscription-option"
            }
            onClick={() => onSubscriptionTierChange("free")}
          >
            Free
          </button>

          <button
            type="button"
            className={
              subscriptionTier === "premium"
                ? "subscription-option active"
                : "subscription-option"
            }
            onClick={() => onSubscriptionTierChange("premium")}
          >
            Premium
          </button>
        </div>
      </div>
    </div>
  );
}

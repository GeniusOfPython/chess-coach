import {
  getAdsConsentLabel,
  type AdsConsentStatus,
  type PrivacyConsentState,
} from "../features/consent";
import type { SubscriptionTier } from "../features/featureAccess";
import DataBackupPanel from "./DataBackupPanel";

type Props = {
  compactUi: boolean;
  showCompactUiSetting: boolean;
  showAnalysisArrows: boolean;
  subscriptionTier: SubscriptionTier;
  privacyConsent: PrivacyConsentState;
  showMonetizationSettings: boolean;
  onCompactUiChange: (enabled: boolean) => void;
  onShowAnalysisArrowsChange: (enabled: boolean) => void;
  onSubscriptionTierChange: (tier: SubscriptionTier) => void;
  onPrivacyConsentChange: (status: AdsConsentStatus) => void;
  onPrivacyConsentReset: () => void;
};

export default function AppSettingsPanel({
  compactUi,
  showCompactUiSetting,
  showAnalysisArrows,
  subscriptionTier,
  privacyConsent,
  showMonetizationSettings,
  onCompactUiChange,
  onShowAnalysisArrowsChange,
  onSubscriptionTierChange,
  onPrivacyConsentChange,
  onPrivacyConsentReset,
}: Props) {
  return (
    <div className="app-settings-card">
      {showCompactUiSetting && (
        <div className="setting-row">
          <div>
            <strong>Компактный интерфейс</strong>
            <p>
              Уменьшает отступы и высоту карточек в мобильном приложении.
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
      )}

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

      {showMonetizationSettings && (
        <>
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

          <div className="setting-row consent-row">
            <div>
              <strong>Согласие на рекламу</strong>
              <p>
                Заготовка под требования мобильной бесплатной версии. В
                реальном релизе этот слой будет связан с рекламным SDK и
                экраном политики конфиденциальности.
              </p>

              <span className="consent-status">
                {getAdsConsentLabel(privacyConsent)}
              </span>
            </div>

            <div className="consent-options">
              <button
                type="button"
                className={
                  privacyConsent.ads === "personalized"
                    ? "consent-option active"
                    : "consent-option"
                }
                onClick={() =>
                  onPrivacyConsentChange("personalized")
                }
              >
                Персонализированная
              </button>

              <button
                type="button"
                className={
                  privacyConsent.ads === "nonPersonalized"
                    ? "consent-option active"
                    : "consent-option"
                }
                onClick={() =>
                  onPrivacyConsentChange("nonPersonalized")
                }
              >
                Обычная
              </button>

              <button
                type="button"
                className={
                  privacyConsent.ads === "declined"
                    ? "consent-option active"
                    : "consent-option"
                }
                onClick={() =>
                  onPrivacyConsentChange("declined")
                }
              >
                Отклонить
              </button>

              <button
                type="button"
                className="consent-option reset"
                onClick={onPrivacyConsentReset}
              >
                Сбросить
              </button>
            </div>
          </div>
        </>
      )}

      <DataBackupPanel />
    </div>
  );
}

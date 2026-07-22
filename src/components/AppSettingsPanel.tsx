import type { CSSProperties } from "react";
import {
  getAdsConsentLabel,
  type AdsConsentStatus,
  type PrivacyConsentState,
} from "../features/consent";
import type { SubscriptionTier } from "../features/featureAccess";
import { getEntitlementLabel } from "../features/entitlement";
import type {
  EntitlementSnapshot,
  PurchaseRestoreStatus,
} from "../types/entitlement";
import {
  BOARD_THEMES,
  type BoardThemeId,
} from "../theme/boardThemes";
import DataBackupPanel from "./DataBackupPanel";

type Props = {
  compactUi: boolean;
  showCompactUiSetting: boolean;
  showAnalysisArrows: boolean;
  boardTheme: BoardThemeId;
  entitlement: EntitlementSnapshot;
  subscriptionTier: SubscriptionTier;
  canRestorePurchases: boolean;
  restoreStatus: PurchaseRestoreStatus;
  privacyConsent: PrivacyConsentState;
  showMonetizationSettings: boolean;
  onCompactUiChange: (enabled: boolean) => void;
  onShowAnalysisArrowsChange: (enabled: boolean) => void;
  onBoardThemeChange: (theme: BoardThemeId) => void;
  onRestorePurchases: () => void;
  onPrivacyConsentChange: (status: AdsConsentStatus) => void;
  onPrivacyConsentReset: () => void;
};

export default function AppSettingsPanel({
  compactUi,
  showCompactUiSetting,
  showAnalysisArrows,
  boardTheme,
  entitlement,
  subscriptionTier,
  canRestorePurchases,
  restoreStatus,
  privacyConsent,
  showMonetizationSettings,
  onCompactUiChange,
  onShowAnalysisArrowsChange,
  onBoardThemeChange,
  onRestorePurchases,
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
              Уменьшает отступы и высоту карточек на небольших экранах.
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

      <div className="setting-row setting-row-stack">
        <div>
          <strong>Оформление доски</strong>
          <p>Три контрастные темы в общей ретровейв-палитре.</p>
        </div>

        <div className="board-theme-options" role="group" aria-label="Оформление доски">
          {BOARD_THEMES.map((theme) => (
            <button
              type="button"
              className={
                theme.id === boardTheme
                  ? "board-theme-option active"
                  : "board-theme-option"
              }
              aria-pressed={theme.id === boardTheme}
              key={theme.id}
              onClick={() => onBoardThemeChange(theme.id)}
            >
              <span
                className="board-theme-preview"
                aria-hidden="true"
                style={{
                  "--board-light": theme.previewLight,
                  "--board-dark": theme.previewDark,
                } as CSSProperties}
              />
              <span>
                <strong>{theme.name}</strong>
                <small>{theme.description}</small>
              </span>
            </button>
          ))}
        </div>
      </div>

      {showMonetizationSettings && (
        <>
          <div className="setting-row subscription-row">
            <div>
              <strong>Тариф</strong>
              <p>
                Право доступа подтверждается магазином или сервером. Оно не
                влияет на честность активной партии.
              </p>
            </div>

            <div className="subscription-status" aria-live="polite">
              <span className={`subscription-badge ${subscriptionTier}`}>
                {getEntitlementLabel(entitlement)}
              </span>
              {entitlement.kind === "temporary" && entitlement.expiresAt && (
                <small>
                  До {new Intl.DateTimeFormat("ru-RU", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  }).format(new Date(entitlement.expiresAt))}
                </small>
              )}
              <button
                type="button"
                className="subscription-restore"
                disabled={!canRestorePurchases || restoreStatus === "restoring"}
                onClick={onRestorePurchases}
              >
                {restoreStatus === "restoring"
                  ? "Восстановление…"
                  : "Восстановить покупки"}
              </button>
              {!canRestorePurchases && (
                <small>Платёжный адаптер в этой сборке не подключён.</small>
              )}
              {restoreStatus === "restored" && (
                <small>Доступ восстановлен.</small>
              )}
              {restoreStatus === "not_found" && (
                <small>Активные покупки не найдены.</small>
              )}
              {restoreStatus === "error" && (
                <small>Не удалось проверить покупки.</small>
              )}
            </div>
          </div>

          {subscriptionTier === "free" && (
          <div className="setting-row consent-row">
            <div>
              <strong>Согласие на рекламу</strong>
              <p>
                Выбранный вариант определяет формат рекламных материалов в
                бесплатной версии. Настройку можно изменить в любой момент.
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
          )}
        </>
      )}

      <DataBackupPanel />
    </div>
  );
}

import { lazy, Suspense } from "react";
import AppSettingsPanel from "../components/AppSettingsPanel";
import ChessAchievementsPanel from "../components/ChessAchievementsPanel";
import CollapsibleSection from "../components/CollapsibleSection";
import FenPanel from "../components/FenPanel";
import GameArchivePanel from "../components/GameArchivePanel";
import LearningJournalPanel from "../components/LearningJournalPanel";
import MoveHistory from "../components/MoveHistory";
import MoveNavigatorPanel from "../components/MoveNavigatorPanel";
import OpeningPrinciplesPanel from "../components/OpeningPrinciplesPanel";
import PgnPanel from "../components/PgnPanel";
import PremiumFeatureNotice from "../components/PremiumFeatureNotice";
import TrainingSummaryPanel from "../components/TrainingSummaryPanel";
import type { ChessCoachController } from "./useChessCoachController";
import "../components/MoveNavigatorPanel.css";
import "../components/TrainingSummaryPanel.css";
import "../components/OpeningPrinciplesPanel.css";
import "../components/AppSettingsPanel.css";

const DiagnosticProfilePanel = lazy(() =>
  import("../components/DiagnosticProfilePanel")
);

export default function ToolsWorkspace({
  controller,
}: {
  controller: ChessCoachController;
}) {
  const {
    preferences,
    journal,
    archive,
    achievements,
    onboarding,
    game,
    platform,
    entitlement,
    access,
    actions,
  } = controller;

  return (
    <section className="workspace-panel">
      <CollapsibleSection
        title="Достижения"
        description="Проверяемые шахматные события в честных партиях"
        persistenceId="achievements"
      >
        <ChessAchievementsPanel unlocked={achievements.unlocked} />
      </CollapsibleSection>

      <CollapsibleSection
        title="Дебютные принципы"
        description="Центр, развитие фигур и безопасность короля"
        persistenceId="opening"
      >
        <OpeningPrinciplesPanel fen={game.displayedPosition} />
      </CollapsibleSection>

      <CollapsibleSection
        title="Журнал и сводка"
        description="Ошибки, точность и учебная статистика"
        persistenceId="learning-journal"
      >
        {onboarding.status === "complete" && (
          <Suspense fallback={null}>
            <DiagnosticProfilePanel profile={onboarding.result} />
          </Suspense>
        )}

        <TrainingSummaryPanel
          historyLength={game.history.length}
          items={journal.items}
        />

        <LearningJournalPanel
          items={journal.items}
          onClear={journal.clear}
        />
      </CollapsibleSection>

      <CollapsibleSection
        title="История ходов"
        description="Список ходов и просмотр прошлых позиций"
        persistenceId="history"
      >
        <MoveNavigatorPanel
          currentIndex={game.viewedMoveIndex}
          totalPositions={game.fenHistory.length}
          isViewingCurrentPosition={game.isViewingCurrentPosition}
          onPrevious={game.viewPreviousMove}
          onNext={game.viewNextMove}
          onCurrent={game.viewCurrentMove}
        />

        <MoveHistory history={game.history} />
      </CollapsibleSection>

      <CollapsibleSection
        title="Архив партий"
        description="Завершённые партии сохраняются автоматически"
        persistenceId="game-archive"
      >
        <GameArchivePanel
          games={archive.games}
          onOpen={actions.handleOpenArchivedGame}
          onRemove={archive.remove}
          onClear={archive.clear}
        />
      </CollapsibleSection>

      <CollapsibleSection
        title="PGN и FEN"
        description="Импорт, экспорт партии и загрузка позиции"
        persistenceId="position-tools"
      >
        {access.canUsePgnTools ? (
          <PgnPanel
            pgn={game.getPgn()}
            onImportPgn={actions.handleImportPgn}
          />
        ) : (
          <PremiumFeatureNotice
            featureKey="pgnTools"
            description="Импорт и экспорт партий доступны в Premium."
          />
        )}

        {access.canUseFenTools ? (
          <FenPanel
            fen={game.getFen()}
            onImportFen={actions.handleImportFen}
          />
        ) : (
          <PremiumFeatureNotice
            featureKey="fenTools"
            description="Загрузка и сохранение позиций доступны в Premium."
          />
        )}
      </CollapsibleSection>

      <CollapsibleSection
        title="Настройки"
        description="Компактный режим и поведение подсказок"
        persistenceId="settings"
      >
        <AppSettingsPanel
          compactUi={preferences.compactUi}
          showCompactUiSetting={platform.isNativeApp}
          showAnalysisArrows={preferences.showAnalysisArrows}
          boardTheme={preferences.boardTheme}
          entitlement={entitlement.snapshot}
          subscriptionTier={access.tier}
          entitlementAccessStatus={entitlement.accessStatus}
          entitlementEffectiveUntil={entitlement.effectiveUntil}
          entitlementVerificationStatus={entitlement.verificationStatus}
          canRestorePurchases={entitlement.canRestorePurchases}
          restoreStatus={entitlement.restoreStatus}
          canPurchase={entitlement.canPurchase}
          offers={entitlement.offers}
          offersStatus={entitlement.offersStatus}
          purchaseStatus={entitlement.purchaseStatus}
          canManageSubscription={entitlement.canManageSubscription}
          managementStatus={entitlement.managementStatus}
          privacyConsent={preferences.privacyConsent}
          showMonetizationSettings={platform.showAdvertisingUi}
          onCompactUiChange={preferences.setCompactUi}
          onShowAnalysisArrowsChange={preferences.setShowAnalysisArrows}
          onBoardThemeChange={preferences.setBoardTheme}
          onRestorePurchases={() => void entitlement.restorePurchases()}
          onLoadOffers={() => void entitlement.loadOffers()}
          onPurchase={(productId) => void entitlement.purchasePremium(productId)}
          onManageSubscription={() =>
            void entitlement.openSubscriptionManagement()}
          onPrivacyConsentChange={actions.handlePrivacyConsentChange}
          onPrivacyConsentReset={actions.handleResetPrivacyConsent}
        />
      </CollapsibleSection>
    </section>
  );
}

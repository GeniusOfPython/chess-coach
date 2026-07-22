import { useEffect, useState } from "react";
import {
  createPrivacyConsent,
  type PrivacyConsentState,
} from "../features/consent";
import { appPreferencesRepository } from "../repositories/appPreferencesRepository";

export function useAppPreferences() {
  const [initialPreferences] = useState(() => appPreferencesRepository.load());
  const [gameMode, setGameMode] = useState(initialPreferences.gameMode);
  const [playerSide, setPlayerSide] = useState(initialPreferences.playerSide);
  const [botLevelId, setBotLevelId] = useState(initialPreferences.botLevelId);
  const [activeWorkspace, setActiveWorkspace] = useState(
    initialPreferences.activeWorkspace,
  );
  const [compactUi, setCompactUi] = useState(initialPreferences.compactUi);
  const [showAnalysisArrows, setShowAnalysisArrows] = useState(
    initialPreferences.showAnalysisArrows,
  );
  const [boardTheme, setBoardTheme] = useState(initialPreferences.boardTheme);
  const [privacyConsent, setPrivacyConsent] = useState<PrivacyConsentState>(
    initialPreferences.privacyConsent,
  );

  useEffect(() => appPreferencesRepository.save("gameMode", gameMode), [gameMode]);
  useEffect(() => appPreferencesRepository.save("playerSide", playerSide), [playerSide]);
  useEffect(() => appPreferencesRepository.save("botLevelId", botLevelId), [botLevelId]);
  useEffect(() => appPreferencesRepository.save("activeWorkspace", activeWorkspace), [activeWorkspace]);
  useEffect(() => appPreferencesRepository.save("compactUi", compactUi), [compactUi]);
  useEffect(() => appPreferencesRepository.save("showAnalysisArrows", showAnalysisArrows), [showAnalysisArrows]);
  useEffect(() => appPreferencesRepository.save("boardTheme", boardTheme), [boardTheme]);
  useEffect(() => appPreferencesRepository.save("privacyConsent", privacyConsent), [privacyConsent]);

  function resetPrivacyConsent() {
    setPrivacyConsent(createPrivacyConsent("unknown"));
  }

  function updatePrivacyConsent(status: PrivacyConsentState["ads"]) {
    setPrivacyConsent(createPrivacyConsent(status));
  }

  return {
    gameMode,
    setGameMode,
    playerSide,
    setPlayerSide,
    botLevelId,
    setBotLevelId,
    activeWorkspace,
    setActiveWorkspace,
    compactUi,
    setCompactUi,
    showAnalysisArrows,
    setShowAnalysisArrows,
    boardTheme,
    setBoardTheme,
    privacyConsent,
    updatePrivacyConsent,
    resetPrivacyConsent,
  };
}

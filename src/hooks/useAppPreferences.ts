import { useEffect, useState } from "react";
import type { Color } from "chess.js";
import type { GameMode } from "../game/gameTypes";
import type { WorkspaceId } from "../game/workspaceNavigation";
import type { BotLevelId } from "../types/bot";
import {
  createPrivacyConsent,
  parsePrivacyConsent,
  type PrivacyConsentState,
} from "../features/consent";
import type { SubscriptionTier } from "../features/featureAccess";
import {
  readStorageValue,
  writeJsonStorageValue,
  writeStorageValue,
} from "../platform/appStorage";
import { settingsStorageKeys } from "../platform/storageKeys";
import {
  parseBoardThemeId,
  type BoardThemeId,
} from "../theme/boardThemes";

function readBoolean(key: string, fallback: boolean) {
  const value = readStorageValue(key);

  return value === "true" ? true : value === "false" ? false : fallback;
}

function readGameMode(): GameMode {
  const value = readStorageValue(settingsStorageKeys.gameMode);

  return value === "bot" || value === "analysis" ? value : "analysis";
}

function readPlayerSide(): Color {
  return readStorageValue(settingsStorageKeys.playerSide) === "b" ? "b" : "w";
}

function readBotLevelId(): BotLevelId {
  const value = readStorageValue(settingsStorageKeys.botLevelId);

  return value === "beginner" || value === "casual" || value === "club" || value === "strong" || value === "max"
    ? value
    : "casual";
}

function readWorkspace(): WorkspaceId | null {
  const value = readStorageValue(settingsStorageKeys.activeWorkspace);

  if (value === "none") {
    return null;
  }

  return value === "game" || value === "tools" ? value : "coach";
}

function readSubscriptionTier(): SubscriptionTier {
  return readStorageValue(settingsStorageKeys.subscriptionTier) === "free"
    ? "free"
    : "premium";
}

function readBoardTheme(): BoardThemeId {
  return parseBoardThemeId(readStorageValue(settingsStorageKeys.boardTheme));
}

export function useAppPreferences() {
  const [gameMode, setGameMode] = useState<GameMode>(readGameMode);
  const [playerSide, setPlayerSide] = useState<Color>(readPlayerSide);
  const [botLevelId, setBotLevelId] = useState<BotLevelId>(readBotLevelId);
  const [activeWorkspace, setActiveWorkspace] = useState<WorkspaceId | null>(readWorkspace);
  const [compactUi, setCompactUi] = useState(() =>
    readBoolean(settingsStorageKeys.compactUi, false),
  );
  const [showAnalysisArrows, setShowAnalysisArrows] = useState(() =>
    readBoolean(settingsStorageKeys.showAnalysisArrows, true),
  );
  const [boardTheme, setBoardTheme] = useState<BoardThemeId>(readBoardTheme);
  const [subscriptionTier, setSubscriptionTier] = useState<SubscriptionTier>(readSubscriptionTier);
  const [privacyConsent, setPrivacyConsent] = useState<PrivacyConsentState>(() =>
    parsePrivacyConsent(readStorageValue(settingsStorageKeys.privacyConsent)),
  );

  useEffect(() => writeStorageValue(settingsStorageKeys.gameMode, gameMode), [gameMode]);
  useEffect(() => writeStorageValue(settingsStorageKeys.playerSide, playerSide), [playerSide]);
  useEffect(() => writeStorageValue(settingsStorageKeys.botLevelId, botLevelId), [botLevelId]);
  useEffect(() => writeStorageValue(settingsStorageKeys.activeWorkspace, activeWorkspace ?? "none"), [activeWorkspace]);
  useEffect(() => writeStorageValue(settingsStorageKeys.compactUi, String(compactUi)), [compactUi]);
  useEffect(() => writeStorageValue(settingsStorageKeys.showAnalysisArrows, String(showAnalysisArrows)), [showAnalysisArrows]);
  useEffect(() => writeStorageValue(settingsStorageKeys.boardTheme, boardTheme), [boardTheme]);
  useEffect(() => writeStorageValue(settingsStorageKeys.subscriptionTier, subscriptionTier), [subscriptionTier]);
  useEffect(() => writeJsonStorageValue(settingsStorageKeys.privacyConsent, privacyConsent), [privacyConsent]);

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
    subscriptionTier,
    setSubscriptionTier,
    privacyConsent,
    updatePrivacyConsent,
    resetPrivacyConsent,
  };
}

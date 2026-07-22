import type { Color } from "chess.js";
import {
  parsePrivacyConsent,
  type PrivacyConsentState,
} from "../features/consent";
import type { SubscriptionTier } from "../features/featureAccess";
import type { GameMode } from "../game/gameTypes";
import type { WorkspaceId } from "../game/workspaceNavigation";
import { settingsStorageKeys } from "../platform/storageKeys";
import {
  parseBoardThemeId,
  type BoardThemeId,
} from "../theme/boardThemes";
import type { BotLevelId } from "../types/bot";
import {
  localRepositoryStorage,
  type RepositoryStorage,
} from "./repositoryStorage";

export type AppPreferencesSnapshot = {
  gameMode: GameMode;
  playerSide: Color;
  botLevelId: BotLevelId;
  activeWorkspace: WorkspaceId | null;
  compactUi: boolean;
  showAnalysisArrows: boolean;
  boardTheme: BoardThemeId;
  subscriptionTier: SubscriptionTier;
  privacyConsent: PrivacyConsentState;
};

function readBoolean(value: string | null, fallback: boolean) {
  return value === "true" ? true : value === "false" ? false : fallback;
}

function readGameMode(value: string | null): GameMode {
  return value === "bot" || value === "analysis" ? value : "analysis";
}

function readPlayerSide(value: string | null): Color {
  return value === "b" ? "b" : "w";
}

function readBotLevelId(value: string | null): BotLevelId {
  return value === "beginner" ||
    value === "casual" ||
    value === "club" ||
    value === "strong" ||
    value === "max"
    ? value
    : "casual";
}

function readWorkspace(value: string | null): WorkspaceId | null {
  if (value === "none") {
    return null;
  }

  return value === "game" || value === "tools" ? value : "coach";
}

function readSubscriptionTier(value: string | null): SubscriptionTier {
  return value === "free" ? "free" : "premium";
}

export function createAppPreferencesRepository(
  storage: RepositoryStorage = localRepositoryStorage,
) {
  return {
    load(): AppPreferencesSnapshot {
      return {
        gameMode: readGameMode(storage.read(settingsStorageKeys.gameMode)),
        playerSide: readPlayerSide(storage.read(settingsStorageKeys.playerSide)),
        botLevelId: readBotLevelId(storage.read(settingsStorageKeys.botLevelId)),
        activeWorkspace: readWorkspace(
          storage.read(settingsStorageKeys.activeWorkspace),
        ),
        compactUi: readBoolean(
          storage.read(settingsStorageKeys.compactUi),
          false,
        ),
        showAnalysisArrows: readBoolean(
          storage.read(settingsStorageKeys.showAnalysisArrows),
          true,
        ),
        boardTheme: parseBoardThemeId(
          storage.read(settingsStorageKeys.boardTheme),
        ),
        subscriptionTier: readSubscriptionTier(
          storage.read(settingsStorageKeys.subscriptionTier),
        ),
        privacyConsent: parsePrivacyConsent(
          storage.read(settingsStorageKeys.privacyConsent),
        ),
      };
    },

    save<Name extends keyof AppPreferencesSnapshot>(
      name: Name,
      value: AppPreferencesSnapshot[Name],
    ) {
      if (name === "privacyConsent") {
        storage.write(settingsStorageKeys.privacyConsent, JSON.stringify(value));
        return;
      }

      const keys: Record<Exclude<keyof AppPreferencesSnapshot, "privacyConsent">, string> = {
        gameMode: settingsStorageKeys.gameMode,
        playerSide: settingsStorageKeys.playerSide,
        botLevelId: settingsStorageKeys.botLevelId,
        activeWorkspace: settingsStorageKeys.activeWorkspace,
        compactUi: settingsStorageKeys.compactUi,
        showAnalysisArrows: settingsStorageKeys.showAnalysisArrows,
        boardTheme: settingsStorageKeys.boardTheme,
        subscriptionTier: settingsStorageKeys.subscriptionTier,
      };
      const serializedValue = name === "activeWorkspace"
        ? String(value ?? "none")
        : String(value);

      storage.write(
        keys[name as Exclude<keyof AppPreferencesSnapshot, "privacyConsent">],
        serializedValue,
      );
    },
  };
}

export const appPreferencesRepository = createAppPreferencesRepository();

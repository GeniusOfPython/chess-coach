import {
  parseBotGameStarted,
  parseGameTermination,
} from "../game/gameSessionStorage";
import {
  parseGameArchive,
  type ArchivedGame,
} from "../game/gameArchive";
import type { BotGameTermination } from "../game/gameTypes";
import { gameSessionStorageKeys } from "../platform/storageKeys";
import {
  localRepositoryStorage,
  readJsonRepositoryValue,
  type RepositoryStorage,
  writeJsonRepositoryValue,
} from "./repositoryStorage";

export function createGameSessionRepository(
  storage: RepositoryStorage = localRepositoryStorage,
) {
  return {
    loadCurrentPgn() {
      return storage.read(gameSessionStorageKeys.currentPgn) ?? "";
    },

    saveCurrentPgn(pgn: string) {
      storage.write(gameSessionStorageKeys.currentPgn, pgn);
    },

    loadBotGameStarted() {
      return parseBotGameStarted(
        storage.read(gameSessionStorageKeys.botGameStarted),
      );
    },

    saveBotGameStarted(isStarted: boolean) {
      storage.write(gameSessionStorageKeys.botGameStarted, String(isStarted));
    },

    loadTermination() {
      return parseGameTermination(readJsonRepositoryValue<unknown>({
        storage,
        key: gameSessionStorageKeys.gameTermination,
        fallback: null,
      }));
    },

    saveTermination(termination: BotGameTermination | null) {
      writeJsonRepositoryValue(
        storage,
        gameSessionStorageKeys.gameTermination,
        termination,
      );
    },

    loadArchive() {
      return parseGameArchive(readJsonRepositoryValue<unknown>({
        storage,
        key: gameSessionStorageKeys.gameArchive,
        fallback: [],
      }));
    },

    saveArchive(games: ArchivedGame[]) {
      writeJsonRepositoryValue(
        storage,
        gameSessionStorageKeys.gameArchive,
        games,
      );
    },
  };
}

export const gameSessionRepository = createGameSessionRepository();

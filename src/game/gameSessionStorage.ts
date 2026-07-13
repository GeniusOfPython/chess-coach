import {
  readStorageValue,
  writeStorageValue,
} from "../platform/appStorage";
import { gameSessionStorageKeys } from "../platform/storageKeys";

export function parseBotGameStarted(value: string | null) {
  return value === "true";
}

export function readBotGameStarted() {
  return parseBotGameStarted(
    readStorageValue(gameSessionStorageKeys.botGameStarted),
  );
}

export function writeBotGameStarted(isStarted: boolean) {
  writeStorageValue(
    gameSessionStorageKeys.botGameStarted,
    String(isStarted),
  );
}

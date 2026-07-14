import { useCallback, useState } from "react";
import {
  addGameToArchive,
  parseGameArchive,
  type ArchivedGame,
} from "../game/gameArchive";
import {
  readJsonStorageValue,
  writeJsonStorageValue,
} from "../platform/appStorage";
import { gameSessionStorageKeys } from "../platform/storageKeys";

function readArchive() {
  return parseGameArchive(readJsonStorageValue<unknown>({
    key: gameSessionStorageKeys.gameArchive,
    fallback: [],
  }));
}

export function useGameArchive() {
  const [games, setGames] = useState<ArchivedGame[]>(readArchive);

  const addGame = useCallback((game: ArchivedGame) => {
    setGames((currentGames) => {
      const nextGames = addGameToArchive(currentGames, game);

      if (nextGames !== currentGames) {
        writeJsonStorageValue(gameSessionStorageKeys.gameArchive, nextGames);
      }

      return nextGames;
    });
  }, []);

  const removeGame = useCallback((gameId: string) => {
    setGames((currentGames) => {
      const nextGames = currentGames.filter((game) => game.id !== gameId);
      writeJsonStorageValue(gameSessionStorageKeys.gameArchive, nextGames);
      return nextGames;
    });
  }, []);

  const clearGames = useCallback(() => {
    setGames([]);
    writeJsonStorageValue(gameSessionStorageKeys.gameArchive, []);
  }, []);

  return { games, addGame, removeGame, clearGames };
}

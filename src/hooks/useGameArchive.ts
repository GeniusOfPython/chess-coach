import { useCallback, useState } from "react";
import {
  addGameToArchive,
  type ArchivedGame,
} from "../game/gameArchive";
import { gameSessionRepository } from "../repositories/gameSessionRepository";

export function useGameArchive() {
  const [games, setGames] = useState<ArchivedGame[]>(
    gameSessionRepository.loadArchive,
  );

  const addGame = useCallback((game: ArchivedGame) => {
    setGames((currentGames) => {
      const nextGames = addGameToArchive(currentGames, game);

      if (nextGames !== currentGames) {
        gameSessionRepository.saveArchive(nextGames);
      }

      return nextGames;
    });
  }, []);

  const removeGame = useCallback((gameId: string) => {
    setGames((currentGames) => {
      const nextGames = currentGames.filter((game) => game.id !== gameId);
      gameSessionRepository.saveArchive(nextGames);
      return nextGames;
    });
  }, []);

  const clearGames = useCallback(() => {
    setGames([]);
    gameSessionRepository.saveArchive([]);
  }, []);

  return { games, addGame, removeGame, clearGames };
}

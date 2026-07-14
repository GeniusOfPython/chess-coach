import { BOT_LEVELS, type BotLevelId } from "../types/bot";
import type {
  ArchivedGame,
  ArchivedGameOutcome,
} from "./gameArchive";

export type GameArchiveStats = {
  botGames: number;
  wins: number;
  draws: number;
  losses: number;
  scorePercent: number;
  currentWinStreak: number;
  bestWinStreak: number;
  strongestDefeatedLevel: BotLevelId | null;
  recentForm: ArchivedGameOutcome[];
};

const levelStrength = new Map(
  BOT_LEVELS.map((level, index) => [level.id, index]),
);

export function buildGameArchiveStats(
  games: ArchivedGame[],
): GameArchiveStats {
  const botGames = games.filter((game) => game.mode === "bot");
  const wins = botGames.filter((game) => game.outcome === "win").length;
  const draws = botGames.filter((game) => game.outcome === "draw").length;
  const losses = botGames.filter((game) => game.outcome === "loss").length;
  const scoredGames = wins + draws + losses;
  let currentWinStreak = 0;

  for (const game of botGames) {
    if (game.outcome !== "win") {
      break;
    }

    currentWinStreak += 1;
  }

  let bestWinStreak = 0;
  let runningWinStreak = 0;

  for (const game of [...botGames].reverse()) {
    if (game.outcome === "win") {
      runningWinStreak += 1;
      bestWinStreak = Math.max(bestWinStreak, runningWinStreak);
    } else {
      runningWinStreak = 0;
    }
  }

  const strongestDefeatedLevel = botGames.reduce<BotLevelId | null>(
    (strongestLevel, game) => {
      if (game.outcome !== "win" || !game.botLevelId) {
        return strongestLevel;
      }

      if (
        strongestLevel === null ||
        (levelStrength.get(game.botLevelId) ?? -1) >
          (levelStrength.get(strongestLevel) ?? -1)
      ) {
        return game.botLevelId;
      }

      return strongestLevel;
    },
    null,
  );

  return {
    botGames: botGames.length,
    wins,
    draws,
    losses,
    scorePercent: scoredGames > 0
      ? Math.round(((wins + draws * 0.5) / scoredGames) * 100)
      : 0,
    currentWinStreak,
    bestWinStreak,
    strongestDefeatedLevel,
    recentForm: botGames
      .filter((game) => game.outcome !== "completed")
      .slice(0, 8)
      .map((game) => game.outcome),
  };
}

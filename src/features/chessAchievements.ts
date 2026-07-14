import type { Chess } from "chess.js";
import type { Color } from "chess.js";
import type { GameMode } from "../game/gameTypes";

export type ChessAchievementId =
  | "quick_mate"
  | "knight_mate"
  | "en_passant"
  | "underpromotion";

export type ChessAchievement = {
  id: ChessAchievementId;
  title: string;
  description: string;
};

export type UnlockedChessAchievement = {
  id: ChessAchievementId;
  unlockedAt: string;
};

export const chessAchievements: ChessAchievement[] = [
  {
    id: "quick_mate",
    title: "Молниеносный мат",
    description: "Поставить мат не позднее пятого полного хода.",
  },
  {
    id: "knight_mate",
    title: "Мат конём",
    description: "Завершить победную партию матующим ходом коня.",
  },
  {
    id: "en_passant",
    title: "На проходе",
    description: "Выполнить взятие пешки на проходе в партии против бота.",
  },
  {
    id: "underpromotion",
    title: "Точный выбор",
    description: "Превратить пешку не в ферзя, а в ладью, слона или коня.",
  },
];

const achievementIds = new Set(
  chessAchievements.map((achievement) => achievement.id),
);

export function parseUnlockedAchievements(
  value: unknown,
): UnlockedChessAchievement[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const seen = new Set<ChessAchievementId>();
  const unlocked: UnlockedChessAchievement[] = [];

  for (const item of value) {
    if (
      typeof item !== "object" ||
      item === null ||
      !("id" in item) ||
      !("unlockedAt" in item) ||
      typeof item.id !== "string" ||
      !achievementIds.has(item.id as ChessAchievementId) ||
      seen.has(item.id as ChessAchievementId) ||
      typeof item.unlockedAt !== "string" ||
      Number.isNaN(Date.parse(item.unlockedAt))
    ) {
      continue;
    }

    const id = item.id as ChessAchievementId;
    seen.add(id);
    unlocked.push({ id, unlockedAt: item.unlockedAt });
  }

  return unlocked;
}

export function detectChessAchievements({
  game,
  mode,
  playerSide,
}: {
  game: Chess;
  mode: GameMode;
  playerSide: Color;
}): ChessAchievementId[] {
  if (mode !== "bot" || !game.isGameOver()) {
    return [];
  }

  const history = game.history({ verbose: true });
  const playerMoves = history.filter((move) => move.color === playerSide);
  const lastMove = history.at(-1);
  const playerWonByMate =
    game.isCheckmate() &&
    ((game.turn() === "b" && playerSide === "w") ||
      (game.turn() === "w" && playerSide === "b"));
  const detected: ChessAchievementId[] = [];

  if (playerWonByMate && history.length <= 10) {
    detected.push("quick_mate");
  }

  if (
    playerWonByMate &&
    lastMove?.color === playerSide &&
    lastMove.piece === "n"
  ) {
    detected.push("knight_mate");
  }

  if (playerMoves.some((move) => move.flags.includes("e"))) {
    detected.push("en_passant");
  }

  if (
    playerMoves.some(
      (move) => move.promotion !== undefined && move.promotion !== "q",
    )
  ) {
    detected.push("underpromotion");
  }

  return detected;
}

export function getChessAchievement(id: ChessAchievementId) {
  return chessAchievements.find((achievement) => achievement.id === id);
}

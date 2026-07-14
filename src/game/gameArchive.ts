import type { Color } from "chess.js";
import type { BotLevelId } from "../types/bot";
import type { GameMode } from "./gameTypes";

export type ArchivedGameOutcome = "win" | "loss" | "draw" | "completed";

export type ArchivedGame = {
  id: string;
  finishedAt: string;
  mode: GameMode;
  playerSide: Color | null;
  botLevelId: BotLevelId | null;
  result: string;
  outcome: ArchivedGameOutcome;
  halfMoves: number;
  pgn: string;
};

const maximumArchiveEntries = 30;
const maximumPgnLength = 20_000;
const botLevelIds = new Set<BotLevelId>([
  "beginner",
  "casual",
  "club",
  "strong",
  "max",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isArchivedGame(value: unknown): value is ArchivedGame {
  if (!isRecord(value)) {
    return false;
  }

  const validMode = value.mode === "analysis" || value.mode === "bot";
  const validPlayerSide =
    value.playerSide === null || value.playerSide === "w" || value.playerSide === "b";
  const validBotLevel =
    value.botLevelId === null ||
    (typeof value.botLevelId === "string" &&
      botLevelIds.has(value.botLevelId as BotLevelId));
  const validOutcome =
    value.outcome === "win" ||
    value.outcome === "loss" ||
    value.outcome === "draw" ||
    value.outcome === "completed";

  return (
    typeof value.id === "string" &&
    value.id.length > 0 &&
    value.id.length <= 120 &&
    typeof value.finishedAt === "string" &&
    !Number.isNaN(Date.parse(value.finishedAt)) &&
    validMode &&
    validPlayerSide &&
    validBotLevel &&
    typeof value.result === "string" &&
    value.result.length <= 16 &&
    validOutcome &&
    typeof value.halfMoves === "number" &&
    Number.isInteger(value.halfMoves) &&
    value.halfMoves > 0 &&
    typeof value.pgn === "string" &&
    value.pgn.length > 0 &&
    value.pgn.length <= maximumPgnLength
  );
}

export function parseGameArchive(value: unknown): ArchivedGame[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(isArchivedGame)
    .slice(0, maximumArchiveEntries);
}

function createArchiveId(finishedAt: string) {
  const randomPart = globalThis.crypto?.randomUUID?.() ??
    Math.random().toString(36).slice(2);
  return `${finishedAt}:${randomPart}`;
}

export function resolveArchivedGameOutcome({
  mode,
  playerSide,
  winner,
}: {
  mode: GameMode;
  playerSide: Color;
  winner: "white" | "black" | "draw" | null;
}): ArchivedGameOutcome {
  if (winner === "draw") {
    return "draw";
  }

  if (mode !== "bot" || winner === null) {
    return "completed";
  }

  const playerWon =
    (winner === "white" && playerSide === "w") ||
    (winner === "black" && playerSide === "b");
  return playerWon ? "win" : "loss";
}

export function createArchivedGame({
  pgn,
  mode,
  playerSide,
  botLevelId,
  result,
  winner,
  halfMoves,
  finishedAt = new Date().toISOString(),
}: {
  pgn: string;
  mode: GameMode;
  playerSide: Color;
  botLevelId: BotLevelId;
  result: string;
  winner: "white" | "black" | "draw" | null;
  halfMoves: number;
  finishedAt?: string;
}): ArchivedGame {
  return {
    id: createArchiveId(finishedAt),
    finishedAt,
    mode,
    playerSide: mode === "bot" ? playerSide : null,
    botLevelId: mode === "bot" ? botLevelId : null,
    result,
    outcome: resolveArchivedGameOutcome({ mode, playerSide, winner }),
    halfMoves,
    pgn: pgn.slice(0, maximumPgnLength),
  };
}

export function addGameToArchive(
  archive: ArchivedGame[],
  game: ArchivedGame,
) {
  if (archive[0]?.pgn === game.pgn) {
    return archive;
  }

  return [game, ...archive].slice(0, maximumArchiveEntries);
}

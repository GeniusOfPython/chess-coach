import type { Color } from "chess.js";
import type { GameMode } from "../components/GameModeSelector";

export function isBotTurn({
  mode,
  started,
  isGameOver,
  turn,
  playerSide,
}: {
  mode: GameMode;
  started: boolean;
  isGameOver: boolean;
  turn: Color;
  playerSide: Color;
}) {
  return (
    mode === "bot" &&
    started &&
    !isGameOver &&
    turn !== playerSide
  );
}

export function isPlayerTurn({
  mode,
  started,
  turn,
  playerSide,
}: {
  mode: GameMode;
  started: boolean;
  turn: Color;
  playerSide: Color;
}) {
  return mode === "analysis" || (started && turn === playerSide);
}

import type { GameMode } from "./gameTypes";

export function isBotFairPlayActive({
  mode,
  started,
  isGameOver,
}: {
  mode: GameMode;
  started: boolean;
  isGameOver: boolean;
}) {
  return mode === "bot" && started && !isGameOver;
}

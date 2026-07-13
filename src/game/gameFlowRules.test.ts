import { describe, expect, it } from "vitest";
import { isBotTurn, isPlayerTurn } from "./gameFlowRules";

describe("game flow rules", () => {
  it("starts with the bot turn when the player chooses black", () => {
    expect(isBotTurn({
      mode: "bot",
      started: true,
      isGameOver: false,
      turn: "w",
      playerSide: "b",
    })).toBe(true);
  });

  it("gives the bot the turn after a white player move", () => {
    expect(isBotTurn({
      mode: "bot",
      started: true,
      isGameOver: false,
      turn: "b",
      playerSide: "w",
    })).toBe(true);
  });

  it("does not start the bot before the game or after game over", () => {
    const base = {
      mode: "bot" as const,
      turn: "b" as const,
      playerSide: "w" as const,
    };

    expect(isBotTurn({ ...base, started: false, isGameOver: false })).toBe(false);
    expect(isBotTurn({ ...base, started: true, isGameOver: true })).toBe(false);
  });

  it("allows both sides in analysis mode", () => {
    expect(isPlayerTurn({
      mode: "analysis",
      started: false,
      turn: "b",
      playerSide: "w",
    })).toBe(true);
  });
});

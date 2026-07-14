import { describe, expect, it } from "vitest";
import { isBotFairPlayActive } from "./fairPlayRules";

describe("bot fair play", () => {
  it("защищает только начатую и незавершённую партию против бота", () => {
    expect(isBotFairPlayActive({
      mode: "bot",
      started: true,
      isGameOver: false,
    })).toBe(true);
    expect(isBotFairPlayActive({
      mode: "bot",
      started: false,
      isGameOver: false,
    })).toBe(false);
    expect(isBotFairPlayActive({
      mode: "bot",
      started: true,
      isGameOver: true,
    })).toBe(false);
    expect(isBotFairPlayActive({
      mode: "analysis",
      started: true,
      isGameOver: false,
    })).toBe(false);
  });
});

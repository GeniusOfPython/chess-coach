import { Chess } from "chess.js";
import { describe, expect, it } from "vitest";
import {
  detectChessAchievements,
  parseUnlockedAchievements,
} from "./chessAchievements";

describe("chess achievements", () => {
  it("распознаёт быстрый мат игрока", () => {
    const game = new Chess();
    game.move("e4");
    game.move("e5");
    game.move("Bc4");
    game.move("Nc6");
    game.move("Qh5");
    game.move("Nf6");
    game.move("Qxf7#");

    expect(detectChessAchievements({
      game,
      mode: "bot",
      playerSide: "w",
    })).toContain("quick_mate");
  });

  it("не выдаёт достижение за быстрый проигрыш", () => {
    const game = new Chess();
    game.move("f3");
    game.move("e5");
    game.move("g4");
    game.move("Qh4#");

    expect(detectChessAchievements({
      game,
      mode: "bot",
      playerSide: "w",
    })).not.toContain("quick_mate");
  });

  it("распознаёт взятие на проходе", () => {
    const game = new Chess();
    game.move("e4");
    game.move("a6");
    game.move("e5");
    game.move("d5");
    game.move("exd6");
    game.move("cxd6");
    game.move("Nf3");
    game.move("Nf6");
    game.move("Ng1");
    game.move("Ng8");
    game.move("Nf3");
    game.move("Nf6");
    game.move("Ng1");
    game.move("Ng8");
    game.move("Nf3");
    game.move("Nf6");
    game.move("Ng1");
    game.move("Ng8");

    expect(game.isGameOver()).toBe(true);
    expect(detectChessAchievements({
      game,
      mode: "bot",
      playerSide: "w",
    })).toContain("en_passant");
  });

  it("очищает повреждённое и повторяющееся состояние", () => {
    const unlockedAt = "2026-07-14T12:00:00.000Z";

    expect(parseUnlockedAchievements([
      { id: "quick_mate", unlockedAt },
      { id: "quick_mate", unlockedAt },
      { id: "unknown", unlockedAt },
    ])).toEqual([{ id: "quick_mate", unlockedAt }]);
  });
});

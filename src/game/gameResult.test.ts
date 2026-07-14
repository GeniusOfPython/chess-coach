import { Chess } from "chess.js";
import { describe, expect, it } from "vitest";
import { getGameResultInfo } from "./gameResult";

describe("game result", () => {
  it("определяет победителя после мата", () => {
    const game = new Chess();
    game.move("f3");
    game.move("e5");
    game.move("g4");
    game.move("Qh4#");

    expect(getGameResultInfo(game)).toMatchObject({
      isGameOver: true,
      result: "0-1",
      winner: "black",
    });
  });

  it("не объявляет результат продолжающейся партии", () => {
    expect(getGameResultInfo(new Chess())).toMatchObject({
      isGameOver: false,
      result: "*",
      winner: null,
    });
  });
});

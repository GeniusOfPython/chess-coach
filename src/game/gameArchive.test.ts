import { describe, expect, it } from "vitest";
import {
  addGameToArchive,
  createArchivedGame,
  parseGameArchive,
  resolveArchivedGameOutcome,
} from "./gameArchive";

describe("game archive", () => {
  it("определяет результат относительно стороны игрока", () => {
    expect(resolveArchivedGameOutcome({
      mode: "bot",
      playerSide: "w",
      winner: "white",
    })).toBe("win");
    expect(resolveArchivedGameOutcome({
      mode: "bot",
      playerSide: "b",
      winner: "white",
    })).toBe("loss");
    expect(resolveArchivedGameOutcome({
      mode: "bot",
      playerSide: "w",
      winner: "draw",
    })).toBe("draw");
  });

  it("создаёт безопасную запись без лишних данных", () => {
    const game = createArchivedGame({
      pgn: "1. e4 e5 2. Nf3 Nc6",
      mode: "bot",
      playerSide: "w",
      botLevelId: "club",
      result: "1-0",
      winner: "white",
      halfMoves: 4,
      finishedAt: "2026-07-14T12:00:00.000Z",
    });

    expect(game).toMatchObject({
      mode: "bot",
      outcome: "win",
      playerSide: "w",
      botLevelId: "club",
      halfMoves: 4,
    });
    expect(game).not.toHaveProperty("email");
  });

  it("не создаёт дубликат при повторном сохранении той же партии", () => {
    const game = createArchivedGame({
      pgn: "1. e4 e5",
      mode: "analysis",
      playerSide: "w",
      botLevelId: "casual",
      result: "1/2-1/2",
      winner: "draw",
      halfMoves: 2,
    });

    expect(addGameToArchive([game], { ...game, id: "another" })).toEqual([game]);
  });

  it("отбрасывает повреждённые записи при чтении", () => {
    const valid = createArchivedGame({
      pgn: "1. e4 e5",
      mode: "analysis",
      playerSide: "w",
      botLevelId: "casual",
      result: "*",
      winner: null,
      halfMoves: 2,
    });

    expect(parseGameArchive([valid, { id: "broken" }])).toEqual([valid]);
    expect(parseGameArchive({ games: [] })).toEqual([]);
  });
});

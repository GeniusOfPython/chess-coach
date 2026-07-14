import { describe, expect, it } from "vitest";
import type { ArchivedGame } from "./gameArchive";
import { buildGameArchiveStats } from "./gameArchiveStats";

function game(
  outcome: ArchivedGame["outcome"],
  botLevelId: ArchivedGame["botLevelId"] = "casual",
): ArchivedGame {
  return {
    id: `${outcome}-${Math.random()}`,
    finishedAt: "2026-07-14T12:00:00.000Z",
    mode: "bot",
    playerSide: "w",
    botLevelId,
    result: outcome === "draw" ? "1/2-1/2" : "1-0",
    outcome,
    halfMoves: 20,
    pgn: `1. e4 e5 ${outcome}-${Math.random()}`,
  };
}

describe("game archive stats", () => {
  it("считает шахматный процент с половиной очка за ничью", () => {
    const stats = buildGameArchiveStats([
      game("win"),
      game("draw"),
      game("loss"),
      game("win"),
    ]);

    expect(stats).toMatchObject({
      botGames: 4,
      wins: 2,
      draws: 1,
      losses: 1,
      scorePercent: 63,
    });
  });

  it("считает текущую и лучшую серию побед", () => {
    const stats = buildGameArchiveStats([
      game("win"),
      game("win"),
      game("loss"),
      game("win"),
      game("win"),
      game("win"),
    ]);

    expect(stats.currentWinStreak).toBe(2);
    expect(stats.bestWinStreak).toBe(3);
  });

  it("не смешивает режим анализа со статистикой против бота", () => {
    const analysisGame = {
      ...game("completed", null),
      mode: "analysis",
      playerSide: null,
    } satisfies ArchivedGame;

    expect(buildGameArchiveStats([analysisGame])).toMatchObject({
      botGames: 0,
      scorePercent: 0,
    });
  });
});

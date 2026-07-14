import { describe, expect, it } from "vitest";
import {
  parseBotGameStarted,
  parseGameTermination,
} from "./gameSessionStorage";

describe("parseBotGameStarted", () => {
  it("восстанавливает только явно активную партию", () => {
    expect(parseBotGameStarted("true")).toBe(true);
    expect(parseBotGameStarted("false")).toBe(false);
    expect(parseBotGameStarted(null)).toBe(false);
    expect(parseBotGameStarted("1")).toBe(false);
  });
});

describe("parseGameTermination", () => {
  it("восстанавливает согласованный результат сдачи", () => {
    expect(parseGameTermination({
      reason: "resignation",
      winner: "black",
      result: "0-1",
    })).toEqual({
      reason: "resignation",
      winner: "black",
      result: "0-1",
    });
  });

  it("отбрасывает противоречивый результат", () => {
    expect(parseGameTermination({
      reason: "resignation",
      winner: "black",
      result: "1-0",
    })).toBeNull();
    expect(parseGameTermination(null)).toBeNull();
  });
});

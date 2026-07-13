import { describe, expect, it } from "vitest";
import { parseBotGameStarted } from "./gameSessionStorage";

describe("parseBotGameStarted", () => {
  it("восстанавливает только явно активную партию", () => {
    expect(parseBotGameStarted("true")).toBe(true);
    expect(parseBotGameStarted("false")).toBe(false);
    expect(parseBotGameStarted(null)).toBe(false);
    expect(parseBotGameStarted("1")).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import {
  DEFAULT_BOARD_THEME,
  getBoardTheme,
  parseBoardThemeId,
} from "./boardThemes";

describe("board themes", () => {
  it("принимает только известные темы", () => {
    expect(parseBoardThemeId("cyber")).toBe("cyber");
    expect(parseBoardThemeId("ultraviolet")).toBe("ultraviolet");
  });

  it("возвращает безопасную тему по умолчанию", () => {
    expect(parseBoardThemeId("green-classic")).toBe(DEFAULT_BOARD_THEME);
    expect(parseBoardThemeId(null)).toBe(DEFAULT_BOARD_THEME);
  });

  it("для каждой темы содержит пару цветов и тень", () => {
    const theme = getBoardTheme("sunset");

    expect(theme.lightSquare).toMatch(/^#/);
    expect(theme.darkSquare).toMatch(/^#/);
    expect(theme.shadow).toContain("rgba");
  });
});

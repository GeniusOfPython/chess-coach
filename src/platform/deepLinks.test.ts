import { describe, expect, it } from "vitest";
import { parseDeepLink } from "./deepLinks";

describe("parseDeepLink", () => {
  it("распознаёт безопасные нативные цели", () => {
    expect(parseDeepLink("chesscoach://workspace/game")).toEqual({
      workspace: "game",
    });
    expect(parseDeepLink("chesscoach://review?move=12")).toEqual({
      workspace: "game",
      moveIndex: 12,
    });
    expect(parseDeepLink("chesscoach://training")).toEqual({
      workspace: "coach",
    });
  });

  it("поддерживает PWA-ссылки и отбрасывает опасные параметры", () => {
    expect(parseDeepLink("https://example.test/?workspace=tools")).toEqual({
      workspace: "tools",
    });
    expect(parseDeepLink("/?workspace=game&position=4")).toEqual({
      workspace: "game",
      moveIndex: 4,
    });
    expect(parseDeepLink("chesscoach://workspace/admin")).toBeNull();
    expect(parseDeepLink("chesscoach://review?move=-1")).toEqual({ workspace: "game" });
    expect(parseDeepLink("javascript:alert(1)")).toBeNull();
  });
});

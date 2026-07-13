import { describe, expect, it } from "vitest";
import { buildAppBackup, parseAppBackup } from "./appBackup";

describe("appBackup", () => {
  it("создаёт и читает версионированную резервную копию", () => {
    const backup = buildAppBackup({
      createdAt: "2026-07-13T20:00:00.000Z",
      data: {
        "chess-coach.current-pgn": "1. e4 e5",
        "chess-coach.game-mode": "bot",
      },
    });

    expect(parseAppBackup(JSON.stringify(backup))).toEqual(backup);
  });

  it("отклоняет неизвестную версию до изменения данных", () => {
    expect(() => parseAppBackup(JSON.stringify({
      format: "chess-coach-backup",
      version: 99,
      createdAt: "2026-07-13T20:00:00.000Z",
      data: {},
    }))).toThrow("не поддерживается");
  });

  it("не принимает ключи других приложений", () => {
    expect(() => parseAppBackup(JSON.stringify(buildAppBackup({
      data: { "other-app.secret": "value" },
    })))).toThrow("недопустимые данные");
  });

  it("не принимает повреждённый JSON", () => {
    expect(() => parseAppBackup("{broken")).toThrow("корректным JSON");
  });
});

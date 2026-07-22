import { describe, expect, it } from "vitest";
import { inspectAppStorageEntries } from "./appStorageHealth";

describe("inspectAppStorageEntries", () => {
  it("выделяет повреждённые известные записи без удаления чужих данных", () => {
    expect(inspectAppStorageEntries({
      "chess-coach.game-mode": "broken",
      "chess-coach.game-archive": "{broken-json",
      "chess-coach.current-pgn": "1. e4 e5",
      "chess-coach.future-key": "keep-for-forward-compatibility",
      "other-app.session": "keep",
    })).toEqual({
      removedEntries: 2,
      categories: ["game", "preferences"],
      invalidKeys: [
        "chess-coach.game-archive",
        "chess-coach.game-mode",
      ],
    });
  });

  it("принимает корректные настройки и состояния секций", () => {
    expect(inspectAppStorageEntries({
      "chess-coach.game-mode": "bot",
      "chess-coach.board-theme": "sunset",
      "chess-coach.section.settings": "open",
      "chess-coach.training-total-attempts": "12",
      "chess-coach.training-review-queue": "[]",
    })).toBeNull();
  });
});

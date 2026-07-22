import { IDBFactory } from "fake-indexeddb";
import { describe, expect, it } from "vitest";
import { createIndexedDbAppStorage } from "./indexedDbStorage";

describe("IndexedDbAppStorage", () => {
  it("атомарно импортирует legacy-данные один раз и сохраняет новые значения", async () => {
    const storage = await createIndexedDbAppStorage(new IDBFactory());
    await storage.write("chess-coach.game-mode", "analysis");

    expect(await storage.importLegacyEntries({
      "chess-coach.game-mode": "bot",
      "chess-coach.current-pgn": "1. e4 e5",
    })).toBe(1);
    expect(await storage.readPrefix("chess-coach.")).toEqual({
      "chess-coach.current-pgn": "1. e4 e5",
      "chess-coach.game-mode": "analysis",
    });

    expect(await storage.importLegacyEntries({
      "chess-coach.player-side": "b",
    })).toBe(0);
    expect(await storage.readPrefix("chess-coach.")).not.toHaveProperty(
      "chess-coach.player-side",
    );
    storage.close();
  });

  it("заменяет только указанный префикс и не затрагивает чужие данные", async () => {
    const storage = await createIndexedDbAppStorage(new IDBFactory());
    await storage.write("chess-coach.old", "remove");
    await storage.write("other-app.session", "keep");

    await storage.replacePrefix("chess-coach.", {
      "chess-coach.new": "saved",
      "other-app.injected": "reject",
    });

    expect(await storage.readPrefix("chess-coach.")).toEqual({
      "chess-coach.new": "saved",
    });
    expect(await storage.readPrefix("other-app.")).toEqual({
      "other-app.session": "keep",
    });
    storage.close();
  });

  it("удаляет отдельную запись без изменения соседних ключей", async () => {
    const storage = await createIndexedDbAppStorage(new IDBFactory());
    await storage.write("chess-coach.first", "1");
    await storage.write("chess-coach.second", "2");
    await storage.remove("chess-coach.first");

    expect(await storage.readPrefix("chess-coach.")).toEqual({
      "chess-coach.second": "2",
    });
    storage.close();
  });
});

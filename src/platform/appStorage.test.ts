import { describe, expect, it } from "vitest";
import {
  createStorageGateway,
  readJsonStorageValue,
  readStorageValue,
  writeStorageValue,
  type StoragePort,
} from "./appStorage";

function createMemoryStorage(): StoragePort {
  const values = new Map<string, string>();

  return {
    get length() {
      return values.size;
    },
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
    key: (index) => [...values.keys()][index] ?? null,
  };
}

describe("createStorageGateway", () => {
  it("читает, записывает и удаляет данные через storage port", () => {
    const gateway = createStorageGateway(() => createMemoryStorage());

    gateway.write("chess-coach.test", "value");
    expect(gateway.read("chess-coach.test")).toBe("value");

    gateway.remove("chess-coach.test");
    expect(gateway.read("chess-coach.test")).toBeNull();
  });

  it("сохраняет приложение рабочим при ошибке storage", () => {
    const blockedStorage = {
      get length(): number {
        throw new Error("blocked");
      },
      getItem() {
        throw new Error("blocked");
      },
      setItem() {
        throw new Error("quota exceeded");
      },
      removeItem() {
        throw new Error("blocked");
      },
      key() {
        throw new Error("blocked");
      },
    } satisfies StoragePort;
    const gateway = createStorageGateway(() => blockedStorage);

    gateway.write("chess-coach.session", "pgn");
    expect(gateway.read("chess-coach.session")).toBe("pgn");
    expect(() => gateway.clearPrefix("chess-coach.")).not.toThrow();
  });

  it("очищает только данные приложения", () => {
    const storage = createMemoryStorage();
    const gateway = createStorageGateway(() => storage);
    gateway.write("chess-coach.progress", "10");
    gateway.write("other-app.setting", "keep");

    gateway.clearPrefix("chess-coach.");

    expect(gateway.read("chess-coach.progress")).toBeNull();
    expect(gateway.read("other-app.setting")).toBe("keep");
  });

  it("возвращает снимок только данных приложения", () => {
    const storage = createMemoryStorage();
    const gateway = createStorageGateway(() => storage);
    gateway.write("chess-coach.game", "pgn");
    gateway.write("chess-coach.mode", "bot");
    gateway.write("other-app.setting", "private");

    expect(gateway.entries("chess-coach.")).toEqual({
      "chess-coach.game": "pgn",
      "chess-coach.mode": "bot",
    });
  });

  it("после активации читает основной снимок IndexedDB, а не устаревшее зеркало", () => {
    const storage = createMemoryStorage();
    storage.setItem("chess-coach.mode", "legacy");
    const gateway = createStorageGateway(() => storage);

    gateway.activatePersistentStorage(
      { "chess-coach.mode": "indexeddb" },
      {
        write: async () => undefined,
        remove: async () => undefined,
        replacePrefix: async () => undefined,
      },
      "chess-coach.",
    );

    expect(gateway.read("chess-coach.mode")).toBe("indexeddb");
  });

  it("синхронизирует зеркало и удаляет отсутствующие в IndexedDB старые ключи", () => {
    const storage = createMemoryStorage();
    storage.setItem("chess-coach.stale", "remove");
    storage.setItem("other-app.session", "keep");
    const gateway = createStorageGateway(() => storage);

    gateway.activatePersistentStorage(
      { "chess-coach.current": "saved" },
      {
        write: async () => undefined,
        remove: async () => undefined,
        replacePrefix: async () => undefined,
      },
      "chess-coach.",
    );

    expect(storage.getItem("chess-coach.stale")).toBeNull();
    expect(storage.getItem("chess-coach.current")).toBe("saved");
    expect(storage.getItem("other-app.session")).toBe("keep");
  });

  it("записывает в IndexedDB и совместимое localStorage-зеркало", async () => {
    const storage = createMemoryStorage();
    const persisted = new Map<string, string>();
    const gateway = createStorageGateway(() => storage);
    gateway.activatePersistentStorage({}, {
      write: async (key, value) => {
        persisted.set(key, value);
      },
      remove: async (key) => {
        persisted.delete(key);
      },
      replacePrefix: async () => undefined,
    });

    gateway.write("chess-coach.mode", "bot");
    await gateway.flush();

    expect(persisted.get("chess-coach.mode")).toBe("bot");
    expect(storage.getItem("chess-coach.mode")).toBe("bot");
  });
});

describe("readJsonStorageValue", () => {
  it("удаляет повреждённый JSON и возвращает fallback", () => {
    const key = "chess-coach.test.corrupted-json";
    writeStorageValue(key, "{broken");

    expect(readJsonStorageValue({ key, fallback: [] })).toEqual([]);
    expect(readStorageValue(key)).toBeNull();
  });
});

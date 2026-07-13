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
});

describe("readJsonStorageValue", () => {
  it("удаляет повреждённый JSON и возвращает fallback", () => {
    const key = "chess-coach.test.corrupted-json";
    writeStorageValue(key, "{broken");

    expect(readJsonStorageValue({ key, fallback: [] })).toEqual([]);
    expect(readStorageValue(key)).toBeNull();
  });
});

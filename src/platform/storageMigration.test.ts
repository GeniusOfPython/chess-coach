import { describe, expect, it } from "vitest";
import type { IndexedDbAppStorage } from "./indexedDbStorage";
import { initializeAppStoragePersistence } from "./storageMigration";

describe("initializeAppStoragePersistence", () => {
  it("переходит в fallback, если IndexedDB недоступна", async () => {
    const result = await initializeAppStoragePersistence({
      createStorage: async () => {
        throw new Error("blocked");
      },
    });

    expect(result).toEqual({
      mode: "local-storage-fallback",
      schemaVersion: 0,
      migratedEntries: 0,
    });
  });

  it("фиксирует успешный переход на версионированную схему", async () => {
    const storage = {
      importLegacyEntries: async () => 3,
      readPrefix: async () => ({ "chess-coach.game-mode": "bot" }),
      write: async () => undefined,
      remove: async () => undefined,
      replacePrefix: async () => undefined,
      close: () => undefined,
    } satisfies IndexedDbAppStorage;

    const result = await initializeAppStoragePersistence({
      createStorage: async () => storage,
    });

    expect(result).toEqual({
      mode: "indexeddb",
      schemaVersion: 1,
      migratedEntries: 3,
    });
  });
});

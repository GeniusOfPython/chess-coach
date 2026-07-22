import {
  activatePersistentAppStorage,
  appStoragePrefix,
  readAppStorageEntries,
} from "./appStorage";
import {
  createIndexedDbAppStorage,
  type IndexedDbAppStorage,
} from "./indexedDbStorage";
import { appDatabaseVersion } from "./storageSchema";

export type StorageMigrationResult = {
  mode: "indexeddb" | "local-storage-fallback";
  schemaVersion: number;
  migratedEntries: number;
};

type MigrationDependencies = {
  createStorage?: () => Promise<IndexedDbAppStorage>;
};

function resolveIndexedDbFactory() {
  if (typeof window === "undefined" || !window.indexedDB) {
    throw new Error("IndexedDB is unavailable");
  }

  return window.indexedDB;
}

export async function initializeAppStoragePersistence(
  dependencies: MigrationDependencies = {},
): Promise<StorageMigrationResult> {
  const legacyEntries = readAppStorageEntries();
  let storage: IndexedDbAppStorage | null = null;

  try {
    storage = await (dependencies.createStorage
      ? dependencies.createStorage()
      : createIndexedDbAppStorage(resolveIndexedDbFactory()));
    const migratedEntries = await storage.importLegacyEntries(legacyEntries);
    const persistentEntries = await storage.readPrefix(appStoragePrefix);

    activatePersistentAppStorage(persistentEntries, storage);

    return {
      mode: "indexeddb",
      schemaVersion: appDatabaseVersion,
      migratedEntries,
    };
  } catch {
    storage?.close();
    return {
      mode: "local-storage-fallback",
      schemaVersion: 0,
      migratedEntries: 0,
    };
  }
}

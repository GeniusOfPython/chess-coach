import type { PersistentStoragePort } from "./appStorage";
import {
  appDatabaseName,
  appDatabaseVersion,
  appDataStoreName,
  appMetadataStoreName,
  applyStorageSchemaMigrations,
} from "./storageSchema";

const legacyMigrationMarker = "legacy-local-storage-imported";

type StoredValue = {
  key: string;
  value: string;
};

type StoredMetadata = {
  key: string;
  value: number | boolean;
};

function requestResult<T>(request: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    request.addEventListener("success", () => resolve(request.result));
    request.addEventListener("error", () => reject(request.error));
  });
}

function transactionDone(transaction: IDBTransaction) {
  return new Promise<void>((resolve, reject) => {
    transaction.addEventListener("complete", () => resolve());
    transaction.addEventListener("abort", () => reject(transaction.error));
    transaction.addEventListener("error", () => reject(transaction.error));
  });
}

function openDatabase(factory: IDBFactory) {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = factory.open(appDatabaseName, appDatabaseVersion);

    request.addEventListener("upgradeneeded", (event) => {
      applyStorageSchemaMigrations(
        request.result,
        (event as IDBVersionChangeEvent).oldVersion,
      );
    });

    request.addEventListener("success", () => resolve(request.result));
    request.addEventListener("error", () => reject(request.error));
    request.addEventListener("blocked", () => {
      reject(new Error("IndexedDB upgrade is blocked"));
    });
  });
}

export type IndexedDbAppStorage = PersistentStoragePort & {
  importLegacyEntries(entries: Record<string, string>): Promise<number>;
  readPrefix(prefix: string): Promise<Record<string, string>>;
  close(): void;
};

export async function createIndexedDbAppStorage(
  factory: IDBFactory,
): Promise<IndexedDbAppStorage> {
  const database = await openDatabase(factory);
  database.addEventListener("versionchange", () => database.close());

  const storage: IndexedDbAppStorage = {
    async importLegacyEntries(entries) {
      const transaction = database.transaction(
        [appDataStoreName, appMetadataStoreName],
        "readwrite",
      );
      const completed = transactionDone(transaction);
      const dataStore = transaction.objectStore(appDataStoreName);
      const metadataStore = transaction.objectStore(appMetadataStoreName);
      const marker = await requestResult(
        metadataStore.get(legacyMigrationMarker) as IDBRequest<StoredMetadata | undefined>,
      );

      if (marker?.value === true) {
        await completed;
        return 0;
      }

      let migratedEntries = 0;
      const existingKeys = new Set(
        (await requestResult(dataStore.getAllKeys())).map(String),
      );

      for (const [key, value] of Object.entries(entries)) {
        if (existingKeys.has(key)) {
          continue;
        }

        dataStore.put({ key, value } satisfies StoredValue);
        migratedEntries += 1;
      }

      metadataStore.put({
        key: legacyMigrationMarker,
        value: true,
      } satisfies StoredMetadata);
      metadataStore.put({
        key: "data-schema-version",
        value: appDatabaseVersion,
      } satisfies StoredMetadata);

      await completed;
      return migratedEntries;
    },

    async readPrefix(prefix) {
      const transaction = database.transaction(appDataStoreName, "readonly");
      const completed = transactionDone(transaction);
      const values = await requestResult(
        transaction.objectStore(appDataStoreName).getAll() as IDBRequest<StoredValue[]>,
      );
      await completed;

      return Object.fromEntries(
        values
          .filter(({ key }) => key.startsWith(prefix))
          .sort((left, right) => left.key.localeCompare(right.key))
          .map(({ key, value }) => [key, value]),
      );
    },

    async write(key, value) {
      const transaction = database.transaction(appDataStoreName, "readwrite");
      const completed = transactionDone(transaction);
      transaction.objectStore(appDataStoreName).put({ key, value } satisfies StoredValue);
      await completed;
    },

    async remove(key) {
      const transaction = database.transaction(appDataStoreName, "readwrite");
      const completed = transactionDone(transaction);
      transaction.objectStore(appDataStoreName).delete(key);
      await completed;
    },

    async replacePrefix(prefix, entries) {
      const transaction = database.transaction(appDataStoreName, "readwrite");
      const completed = transactionDone(transaction);
      const store = transaction.objectStore(appDataStoreName);
      const cursorRequest = store.openCursor();

      await new Promise<void>((resolve, reject) => {
        cursorRequest.addEventListener("error", () => reject(cursorRequest.error));
        cursorRequest.addEventListener("success", () => {
          const cursor = cursorRequest.result;

          if (!cursor) {
            resolve();
            return;
          }

          if (String(cursor.key).startsWith(prefix)) {
            cursor.delete();
          }

          cursor.continue();
        });
      });

      for (const [key, value] of Object.entries(entries)) {
        if (key.startsWith(prefix)) {
          store.put({ key, value } satisfies StoredValue);
        }
      }

      await completed;
    },

    close() {
      database.close();
    },
  };

  return storage;
}

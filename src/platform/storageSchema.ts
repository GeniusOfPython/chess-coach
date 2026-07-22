export const appDatabaseName = "chess-coach";
export const appDataStoreName = "app-data";
export const appMetadataStoreName = "metadata";

type StorageSchemaMigration = {
  version: number;
  apply(database: IDBDatabase): void;
};

export const storageSchemaMigrations: readonly StorageSchemaMigration[] = [
  {
    version: 1,
    apply(database) {
      if (!database.objectStoreNames.contains(appDataStoreName)) {
        database.createObjectStore(appDataStoreName, { keyPath: "key" });
      }

      if (!database.objectStoreNames.contains(appMetadataStoreName)) {
        database.createObjectStore(appMetadataStoreName, { keyPath: "key" });
      }
    },
  },
];

export const appDatabaseVersion = storageSchemaMigrations.at(-1)?.version ?? 0;

export function pendingStorageMigrationVersions(oldVersion: number) {
  return storageSchemaMigrations
    .filter(({ version }) => version > oldVersion)
    .map(({ version }) => version);
}

export function applyStorageSchemaMigrations(
  database: IDBDatabase,
  oldVersion: number,
) {
  for (const migration of storageSchemaMigrations) {
    if (migration.version > oldVersion) {
      migration.apply(database);
    }
  }
}

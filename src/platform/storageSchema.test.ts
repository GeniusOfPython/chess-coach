import { describe, expect, it } from "vitest";
import {
  appDatabaseVersion,
  pendingStorageMigrationVersions,
  storageSchemaMigrations,
} from "./storageSchema";

describe("storageSchema", () => {
  it("содержит непрерывную последовательность версий", () => {
    expect(storageSchemaMigrations.map(({ version }) => version)).toEqual([1]);
    expect(appDatabaseVersion).toBe(1);
  });

  it("запускает только миграции новее текущей схемы", () => {
    expect(pendingStorageMigrationVersions(0)).toEqual([1]);
    expect(pendingStorageMigrationVersions(1)).toEqual([]);
  });
});

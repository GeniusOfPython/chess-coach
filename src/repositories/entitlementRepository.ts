import {
  freeEntitlement,
  parseEntitlement,
} from "../features/entitlement";
import { settingsStorageKeys } from "../platform/storageKeys";
import type { EntitlementSnapshot } from "../types/entitlement";
import {
  localRepositoryStorage,
  type RepositoryStorage,
} from "./repositoryStorage";

export function createEntitlementRepository(
  storage: RepositoryStorage = localRepositoryStorage,
) {
  return {
    load(): EntitlementSnapshot {
      const rawValue = storage.read(settingsStorageKeys.entitlement);

      if (!rawValue) {
        return freeEntitlement;
      }

      try {
        return parseEntitlement(JSON.parse(rawValue));
      } catch {
        storage.remove(settingsStorageKeys.entitlement);
        return freeEntitlement;
      }
    },

    save(entitlement: EntitlementSnapshot) {
      storage.write(
        settingsStorageKeys.entitlement,
        JSON.stringify(parseEntitlement(entitlement)),
      );
    },
  };
}

export const entitlementRepository = createEntitlementRepository();

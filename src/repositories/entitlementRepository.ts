import { settingsStorageKeys } from "../platform/storageKeys";
import {
  localRepositoryStorage,
  type RepositoryStorage,
} from "./repositoryStorage";

export function createEntitlementRepository(
  storage: RepositoryStorage = localRepositoryStorage,
) {
  return {
    clearLegacyAccess() {
      storage.remove(settingsStorageKeys.entitlement);
      storage.remove(settingsStorageKeys.subscriptionTier);
    },
  };
}

export const entitlementRepository = createEntitlementRepository();

import { clearAppStorageValues } from "../platform/appStorage";

export const appDataRepository = {
  clearAll() {
    clearAppStorageValues();
  },
};

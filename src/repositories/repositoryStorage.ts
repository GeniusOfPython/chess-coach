import {
  readStorageValue,
  removeStorageValue,
  writeStorageValue,
} from "../platform/appStorage";

export type RepositoryStorage = {
  read(key: string): string | null;
  write(key: string, value: string): void;
  remove(key: string): void;
};

export const localRepositoryStorage: RepositoryStorage = {
  read: readStorageValue,
  write: writeStorageValue,
  remove: removeStorageValue,
};

export function readJsonRepositoryValue<T>({
  storage,
  key,
  fallback,
}: {
  storage: RepositoryStorage;
  key: string;
  fallback: T;
}): T {
  const rawValue = storage.read(key);

  if (!rawValue) {
    return fallback;
  }

  try {
    return JSON.parse(rawValue) as T;
  } catch {
    storage.remove(key);
    return fallback;
  }
}

export function writeJsonRepositoryValue<T>(
  storage: RepositoryStorage,
  key: string,
  value: T,
) {
  storage.write(key, JSON.stringify(value));
}

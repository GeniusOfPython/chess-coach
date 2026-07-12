const memoryStorage = new Map<string, string>();

function getBrowserStorage(): Storage | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const testKey = "chess-coach.storage-test";
    window.localStorage.setItem(testKey, "1");
    window.localStorage.removeItem(testKey);

    return window.localStorage;
  } catch {
    return null;
  }
}

export function readStorageValue(key: string) {
  const storage = getBrowserStorage();

  if (storage) {
    return storage.getItem(key);
  }

  return memoryStorage.get(key) ?? null;
}

export function writeStorageValue(key: string, value: string) {
  const storage = getBrowserStorage();

  if (storage) {
    storage.setItem(key, value);
    return;
  }

  memoryStorage.set(key, value);
}

export function removeStorageValue(key: string) {
  const storage = getBrowserStorage();

  if (storage) {
    storage.removeItem(key);
    return;
  }

  memoryStorage.delete(key);
}

export function readJsonStorageValue<T>({
  key,
  fallback,
}: {
  key: string;
  fallback: T;
}): T {
  const rawValue = readStorageValue(key);

  if (!rawValue) {
    return fallback;
  }

  try {
    return JSON.parse(rawValue) as T;
  } catch {
    return fallback;
  }
}

export function writeJsonStorageValue<T>(key: string, value: T) {
  writeStorageValue(key, JSON.stringify(value));
}

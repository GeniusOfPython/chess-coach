export type StoragePort = Pick<
  Storage,
  "getItem" | "setItem" | "removeItem" | "key" | "length"
>;

export type PersistentStoragePort = {
  write(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
  replacePrefix(prefix: string, entries: Record<string, string>): Promise<void>;
};

export function createStorageGateway(
  resolveStorage: () => StoragePort | null,
) {
  const memoryStorage = new Map<string, string>();
  let persistentStorage: PersistentStoragePort | null = null;
  let persistenceQueue = Promise.resolve();

  const getStorage = () => {
    try {
      return resolveStorage();
    } catch {
      return null;
    }
  };

  const mirrorWrite = (key: string, value: string) => {
    try {
      getStorage()?.setItem(key, value);
    } catch {
      // localStorage — только совместимое зеркало и аварийный fallback.
    }
  };

  const mirrorRemove = (key: string) => {
    try {
      getStorage()?.removeItem(key);
    } catch {
      // Значение уже удалено из памяти текущего запуска.
    }
  };

  const enqueuePersistence = (operation: () => Promise<void>) => {
    persistenceQueue = persistenceQueue.then(operation, operation).catch(() => {
      // Совместимое localStorage-зеркало уже содержит актуальное значение.
    });
  };

  const removePrefixFromMirror = (prefix: string) => {
    const storage = getStorage();

    if (!storage) {
      return;
    }

    try {
      const keysToRemove: string[] = [];

      for (let index = 0; index < storage.length; index += 1) {
        const key = storage.key(index);

        if (key?.startsWith(prefix)) {
          keysToRemove.push(key);
        }
      }

      keysToRemove.forEach((key) => storage.removeItem(key));
    } catch {
      // Очистка памяти и основного хранилища продолжится.
    }
  };

  return {
    read(key: string) {
      if (persistentStorage) {
        return memoryStorage.get(key) ?? null;
      }

      const storage = getStorage();

      if (storage) {
        try {
          const value = storage.getItem(key);

          if (value !== null) {
            memoryStorage.set(key, value);
            return value;
          }
        } catch {
          // Значение останется доступно из памяти текущей сессии.
        }
      }

      return memoryStorage.get(key) ?? null;
    },

    write(key: string, value: string) {
      memoryStorage.set(key, value);
      mirrorWrite(key, value);

      const storage = persistentStorage;

      if (storage) {
        enqueuePersistence(() => storage.write(key, value));
      }
    },

    remove(key: string) {
      memoryStorage.delete(key);
      mirrorRemove(key);

      const storage = persistentStorage;

      if (storage) {
        enqueuePersistence(() => storage.remove(key));
      }
    },

    clearPrefix(prefix: string) {
      for (const key of memoryStorage.keys()) {
        if (key.startsWith(prefix)) {
          memoryStorage.delete(key);
        }
      }

      removePrefixFromMirror(prefix);

      const storage = persistentStorage;

      if (storage) {
        enqueuePersistence(() => storage.replacePrefix(prefix, {}));
      }
    },

    replacePrefix(prefix: string, entries: Record<string, string>) {
      for (const key of memoryStorage.keys()) {
        if (key.startsWith(prefix)) {
          memoryStorage.delete(key);
        }
      }

      removePrefixFromMirror(prefix);

      for (const [key, value] of Object.entries(entries)) {
        if (!key.startsWith(prefix)) {
          continue;
        }

        memoryStorage.set(key, value);
        mirrorWrite(key, value);
      }

      const storage = persistentStorage;

      if (storage) {
        enqueuePersistence(() => storage.replacePrefix(prefix, entries));
      }
    },

    entries(prefix: string) {
      const values = new Map<string, string>();

      if (!persistentStorage) {
        const storage = getStorage();

        if (storage) {
          try {
            for (let index = 0; index < storage.length; index += 1) {
              const key = storage.key(index);

              if (!key?.startsWith(prefix)) {
                continue;
              }

              const value = storage.getItem(key);

              if (value !== null) {
                values.set(key, value);
              }
            }
          } catch {
            // Доступные значения из памяти будут добавлены ниже.
          }
        }
      }

      for (const [key, value] of memoryStorage) {
        if (key.startsWith(prefix)) {
          values.set(key, value);
        }
      }

      return Object.fromEntries(
        [...values.entries()].sort(([left], [right]) =>
          left.localeCompare(right),
        ),
      );
    },

    activatePersistentStorage(
      entries: Record<string, string>,
      storage: PersistentStoragePort,
      mirroredPrefix?: string,
    ) {
      memoryStorage.clear();

      if (mirroredPrefix) {
        removePrefixFromMirror(mirroredPrefix);
      }

      for (const [key, value] of Object.entries(entries)) {
        memoryStorage.set(key, value);
        mirrorWrite(key, value);
      }

      persistentStorage = storage;
    },

    flush() {
      return persistenceQueue;
    },
  };
}

function resolveBrowserStorage(): Storage | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

const appStorage = createStorageGateway(resolveBrowserStorage);
export const appStoragePrefix = "chess-coach.";

export function readStorageValue(key: string) {
  return appStorage.read(key);
}

export function writeStorageValue(key: string, value: string) {
  appStorage.write(key, value);
}

export function removeStorageValue(key: string) {
  appStorage.remove(key);
}

export function clearAppStorageValues() {
  appStorage.clearPrefix(appStoragePrefix);
}

export function removeAppStorageValue(key: string) {
  if (key.startsWith(appStoragePrefix)) {
    appStorage.remove(key);
  }
}

export function readAppStorageEntries() {
  return appStorage.entries(appStoragePrefix);
}

export function replaceAppStorageEntries(entries: Record<string, string>) {
  appStorage.replacePrefix(appStoragePrefix, entries);
}

export function activatePersistentAppStorage(
  entries: Record<string, string>,
  storage: PersistentStoragePort,
) {
  appStorage.activatePersistentStorage(entries, storage, appStoragePrefix);
}

export function flushAppStorageWrites() {
  return appStorage.flush();
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
    removeStorageValue(key);
    return fallback;
  }
}

export function writeJsonStorageValue<T>(key: string, value: T) {
  writeStorageValue(key, JSON.stringify(value));
}

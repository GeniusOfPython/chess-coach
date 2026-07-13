export type StoragePort = Pick<
  Storage,
  "getItem" | "setItem" | "removeItem" | "key" | "length"
>;

export function createStorageGateway(
  resolveStorage: () => StoragePort | null,
) {
  const memoryStorage = new Map<string, string>();

  const getStorage = () => {
    try {
      return resolveStorage();
    } catch {
      return null;
    }
  };

  return {
    read(key: string) {
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

      try {
        getStorage()?.setItem(key, value);
      } catch {
        // Переполнение или запрет storage не должны останавливать приложение.
      }
    },

    remove(key: string) {
      memoryStorage.delete(key);

      try {
        getStorage()?.removeItem(key);
      } catch {
        // Локальная копия уже удалена.
      }
    },

    clearPrefix(prefix: string) {
      for (const key of memoryStorage.keys()) {
        if (key.startsWith(prefix)) {
          memoryStorage.delete(key);
        }
      }

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
        // Сброс остаётся безопасным даже при заблокированном storage.
      }
    },

    entries(prefix: string) {
      const values = new Map<string, string>();
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
const appStoragePrefix = "chess-coach.";

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

export function readAppStorageEntries() {
  return appStorage.entries(appStoragePrefix);
}

export function replaceAppStorageEntries(entries: Record<string, string>) {
  clearAppStorageValues();

  for (const [key, value] of Object.entries(entries)) {
    if (key.startsWith(appStoragePrefix)) {
      writeStorageValue(key, value);
    }
  }
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

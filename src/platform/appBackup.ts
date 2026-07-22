import {
  flushAppStorageWrites,
  readAppStorageEntries,
  replaceAppStorageEntries,
} from "./appStorage";

const backupFormat = "chess-coach-backup";
const backupVersion = 1;
const appStoragePrefix = "chess-coach.";
const maximumBackupSize = 2_000_000;
const maximumBackupEntries = 300;

export type AppBackup = {
  format: typeof backupFormat;
  version: typeof backupVersion;
  createdAt: string;
  data: Record<string, string>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function buildAppBackup({
  data,
  createdAt = new Date().toISOString(),
}: {
  data: Record<string, string>;
  createdAt?: string;
}): AppBackup {
  return {
    format: backupFormat,
    version: backupVersion,
    createdAt,
    data,
  };
}

export function createAppBackupJson() {
  return JSON.stringify(
    buildAppBackup({ data: readAppStorageEntries() }),
    null,
    2,
  );
}

export function parseAppBackup(rawBackup: string): AppBackup {
  if (rawBackup.length > maximumBackupSize) {
    throw new Error("Файл резервной копии слишком большой");
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(rawBackup);
  } catch {
    throw new Error("Файл не является корректным JSON");
  }

  if (
    !isRecord(parsed) ||
    parsed.format !== backupFormat ||
    parsed.version !== backupVersion ||
    typeof parsed.createdAt !== "string" ||
    Number.isNaN(Date.parse(parsed.createdAt)) ||
    !isRecord(parsed.data)
  ) {
    throw new Error("Формат резервной копии не поддерживается");
  }

  const entries = Object.entries(parsed.data);

  if (entries.length > maximumBackupEntries) {
    throw new Error("В резервной копии слишком много записей");
  }

  const data: Record<string, string> = {};

  for (const [key, value] of entries) {
    if (!key.startsWith(appStoragePrefix) || typeof value !== "string") {
      throw new Error("Резервная копия содержит недопустимые данные");
    }

    data[key] = value;
  }

  return buildAppBackup({
    data,
    createdAt: parsed.createdAt,
  });
}

export async function restoreAppBackup(rawBackup: string) {
  const backup = parseAppBackup(rawBackup);
  replaceAppStorageEntries(backup.data);
  await flushAppStorageWrites();
  return backup;
}

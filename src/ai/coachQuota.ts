import {
  readJsonStorageValue,
  writeJsonStorageValue,
} from "../platform/appStorage";
import { settingsStorageKeys } from "../platform/storageKeys";

type DailyUsage = {
  date: string;
  count: number;
};

function todayKey(now: Date) {
  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");
}

export function normalizeAiCoachUsage(
  value: unknown,
  now = new Date(),
): DailyUsage {
  const today = todayKey(now);

  if (
    typeof value !== "object" ||
    value === null ||
    !("date" in value) ||
    !("count" in value) ||
    value.date !== today ||
    typeof value.count !== "number" ||
    !Number.isInteger(value.count) ||
    value.count < 0
  ) {
    return { date: today, count: 0 };
  }

  return { date: today, count: value.count };
}

export function readAiCoachUsage(now = new Date()) {
  const stored = readJsonStorageValue<unknown>({
    key: settingsStorageKeys.aiCoachDailyUsage,
    fallback: null,
  });

  return normalizeAiCoachUsage(stored, now);
}

export function recordAiCoachUsage(now = new Date()) {
  const current = readAiCoachUsage(now);
  const next = { ...current, count: current.count + 1 };

  writeJsonStorageValue(settingsStorageKeys.aiCoachDailyUsage, next);
  return next;
}

export function getRemainingAiCoachAdvice(
  usage: DailyUsage,
  dailyLimit: number | null,
) {
  return dailyLimit === null
    ? null
    : Math.max(0, dailyLimit - usage.count);
}

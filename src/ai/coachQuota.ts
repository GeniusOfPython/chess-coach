import type { AiCoachQuota } from "../features/featureAccess";

export type AiCoachUsage = {
  periodKey: string;
  count: number;
};

function currentPeriodKey(period: AiCoachQuota["period"], now: Date) {
  const day = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");

  return period === "day" ? day : day.slice(0, 7);
}

export function normalizeAiCoachUsage(
  value: unknown,
  quota: AiCoachQuota,
  now = new Date(),
): AiCoachUsage {
  const periodKey = currentPeriodKey(quota.period, now);

  if (
    typeof value !== "object" ||
    value === null ||
    !("periodKey" in value) ||
    !("count" in value) ||
    value.periodKey !== periodKey ||
    typeof value.count !== "number" ||
    !Number.isInteger(value.count) ||
    value.count < 0
  ) {
    return { periodKey, count: 0 };
  }

  return { periodKey, count: value.count };
}

export function getRemainingAiCoachAdvice(
  usage: AiCoachUsage,
  quota: AiCoachQuota,
) {
  return Math.max(0, quota.limit - usage.count);
}

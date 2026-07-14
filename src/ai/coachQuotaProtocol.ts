export type AiCoachServerQuota = {
  tier: "free" | "premium";
  period: "day" | "month";
  limit: number;
  remaining: number;
};

export const aiCoachQuotaHeaders = {
  tier: "X-AI-Coach-Quota-Tier",
  period: "X-AI-Coach-Quota-Period",
  limit: "X-AI-Coach-Quota-Limit",
  remaining: "X-AI-Coach-Quota-Remaining",
} as const;

function nonNegativeInteger(value: string | null) {
  if (value === null || !/^\d+$/.test(value)) {
    return null;
  }

  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

export function parseAiCoachQuotaHeaders(
  headers: Headers,
): AiCoachServerQuota | null {
  const tier = headers.get(aiCoachQuotaHeaders.tier);
  const period = headers.get(aiCoachQuotaHeaders.period);
  const limit = nonNegativeInteger(headers.get(aiCoachQuotaHeaders.limit));
  const remaining = nonNegativeInteger(
    headers.get(aiCoachQuotaHeaders.remaining),
  );

  if (
    (tier !== "free" && tier !== "premium") ||
    (period !== "day" && period !== "month") ||
    limit === null ||
    limit < 1 ||
    remaining === null ||
    remaining > limit
  ) {
    return null;
  }

  return { tier, period, limit, remaining };
}

export function createAiCoachQuotaHeaders(
  quota: AiCoachServerQuota,
): Record<string, string> {
  return {
    [aiCoachQuotaHeaders.tier]: quota.tier,
    [aiCoachQuotaHeaders.period]: quota.period,
    [aiCoachQuotaHeaders.limit]: String(quota.limit),
    [aiCoachQuotaHeaders.remaining]: String(quota.remaining),
  };
}

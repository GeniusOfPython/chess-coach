import type {
  ConsumeCoachQuota,
  QuotaDecision,
} from "./aiCoachServer";

export type CoachAccessTier = "free" | "premium";

type BudgetOptions = {
  resolveTier: (clientKey: string) => CoachAccessTier;
  freeDailyLimit?: number;
  premiumMonthlyLimit?: number;
  globalDailyLimit?: number;
  now?: () => Date;
};

type Counter = {
  count: number;
  resetsAt: number;
};

const maximumTrackedCounters = 5_000;

function utcDayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function utcMonthKey(date: Date) {
  return date.toISOString().slice(0, 7);
}

function nextUtcDay(date: Date) {
  return Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate() + 1,
  );
}

function nextUtcMonth(date: Date) {
  return Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth() + 1,
    1,
  );
}

function retryAfterSeconds(resetsAt: number, now: number) {
  return Math.max(1, Math.ceil((resetsAt - now) / 1_000));
}

function trimCounters(counters: Map<string, Counter>, now: number) {
  for (const [key, counter] of counters) {
    if (counter.resetsAt <= now) {
      counters.delete(key);
    }
  }

  while (counters.size > maximumTrackedCounters) {
    const oldestKey = counters.keys().next().value;

    if (typeof oldestKey !== "string") {
      break;
    }

    counters.delete(oldestKey);
  }
}

export function createMemoryCoachBudget({
  resolveTier,
  freeDailyLimit = 3,
  premiumMonthlyLimit = 300,
  globalDailyLimit = 500,
  now = () => new Date(),
}: BudgetOptions): ConsumeCoachQuota {
  const counters = new Map<string, Counter>();

  return (clientKey) => {
    const currentDate = now();
    const currentTime = currentDate.getTime();
    trimCounters(counters, currentTime);

    const globalKey = `global:${utcDayKey(currentDate)}`;
    const globalCounter = counters.get(globalKey) ?? {
      count: 0,
      resetsAt: nextUtcDay(currentDate),
    };

    if (globalCounter.count >= globalDailyLimit) {
      return {
        allowed: false,
        reason: "global",
        retryAfterSeconds: retryAfterSeconds(
          globalCounter.resetsAt,
          currentTime,
        ),
      };
    }

    const tier = resolveTier(clientKey);
    const isPremium = tier === "premium";
    const periodKey = isPremium
      ? utcMonthKey(currentDate)
      : utcDayKey(currentDate);
    const clientLimit = isPremium ? premiumMonthlyLimit : freeDailyLimit;
    const clientKeyWithPeriod = `${tier}:${clientKey}:${periodKey}`;
    const clientCounter = counters.get(clientKeyWithPeriod) ?? {
      count: 0,
      resetsAt: isPremium
        ? nextUtcMonth(currentDate)
        : nextUtcDay(currentDate),
    };

    if (clientCounter.count >= clientLimit) {
      return {
        allowed: false,
        reason: isPremium ? "monthly" : "daily",
        quota: {
          tier,
          period: isPremium ? "month" : "day",
          limit: clientLimit,
          remaining: 0,
        },
        retryAfterSeconds: retryAfterSeconds(
          clientCounter.resetsAt,
          currentTime,
        ),
      };
    }

    globalCounter.count += 1;
    clientCounter.count += 1;
    counters.set(globalKey, globalCounter);
    counters.set(clientKeyWithPeriod, clientCounter);
    let finalized = false;

    return {
      allowed: true,
      remaining: clientLimit - clientCounter.count,
      quota: {
        tier,
        period: isPremium ? "month" : "day",
        limit: clientLimit,
        remaining: clientLimit - clientCounter.count,
      },
      commit() {
        finalized = true;
      },
      release() {
        if (finalized) {
          return;
        }

        finalized = true;
        globalCounter.count = Math.max(0, globalCounter.count - 1);
        clientCounter.count = Math.max(0, clientCounter.count - 1);
      },
    };
  };
}

export function combineCoachQuotaConsumers(
  ...consumers: ConsumeCoachQuota[]
): ConsumeCoachQuota {
  return async (clientKey) => {
    let lastDecision: QuotaDecision = { allowed: true };
    const acceptedDecisions: QuotaDecision[] = [];

    for (const consumer of consumers) {
      lastDecision = await consumer(clientKey);

      if (!lastDecision.allowed) {
        await Promise.all(
          acceptedDecisions.map((decision) => decision.release?.()),
        );
        return lastDecision;
      }

      acceptedDecisions.push(lastDecision);
    }

    return {
      ...lastDecision,
      async commit() {
        await Promise.all(
          acceptedDecisions.map((decision) => decision.commit?.()),
        );
      },
      async release() {
        await Promise.all(
          acceptedDecisions.map((decision) => decision.release?.()),
        );
      },
    };
  };
}

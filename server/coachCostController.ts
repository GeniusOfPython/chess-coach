export type CoachTokenUsage = {
  inputTokens: number;
  outputTokens: number;
};

export type CoachCostSnapshot = CoachTokenUsage & {
  budgetUsd: number;
  spentUsd: number;
  reservedUsd: number;
  remainingUsd: number;
  resetsAt: number;
};

export type CoachCostController = {
  tryStart: () => string | null;
  complete: (reservationId: string, usage?: CoachTokenUsage) => void;
  cancel: (reservationId: string) => void;
  getSnapshot: () => CoachCostSnapshot;
};

export type CoachCostSettings = {
  dailyBudgetUsd: number;
  inputUsdPerMillion: number;
  outputUsdPerMillion: number;
  reservedInputTokens: number;
  reservedOutputTokens: number;
};

type CostControllerOptions = CoachCostSettings & {
  now?: () => Date;
};

const defaultCostSettings: CoachCostSettings = {
  dailyBudgetUsd: 1,
  inputUsdPerMillion: 1,
  outputUsdPerMillion: 5,
  reservedInputTokens: 20_000,
  reservedOutputTokens: 450,
};

function positiveNumber(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function nonNegativeInteger(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : fallback;
}

export function resolveCoachCostSettings(
  environment: Record<string, string | undefined>,
): CoachCostSettings {
  return {
    dailyBudgetUsd: positiveNumber(
      environment.AI_COACH_DAILY_BUDGET_USD,
      defaultCostSettings.dailyBudgetUsd,
    ),
    inputUsdPerMillion: positiveNumber(
      environment.AI_COACH_INPUT_USD_PER_MILLION,
      defaultCostSettings.inputUsdPerMillion,
    ),
    outputUsdPerMillion: positiveNumber(
      environment.AI_COACH_OUTPUT_USD_PER_MILLION,
      defaultCostSettings.outputUsdPerMillion,
    ),
    reservedInputTokens: nonNegativeInteger(
      environment.AI_COACH_RESERVED_INPUT_TOKENS,
      defaultCostSettings.reservedInputTokens,
    ),
    reservedOutputTokens: nonNegativeInteger(
      environment.AI_COACH_RESERVED_OUTPUT_TOKENS,
      defaultCostSettings.reservedOutputTokens,
    ),
  };
}

function nextUtcDay(date: Date) {
  return Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate() + 1,
  );
}

function dayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function calculateCost(
  usage: CoachTokenUsage,
  inputUsdPerMillion: number,
  outputUsdPerMillion: number,
) {
  return (
    usage.inputTokens * inputUsdPerMillion +
    usage.outputTokens * outputUsdPerMillion
  ) / 1_000_000;
}

function normalizeUsage(usage: CoachTokenUsage): CoachTokenUsage {
  return {
    inputTokens: Math.max(0, Math.floor(usage.inputTokens)),
    outputTokens: Math.max(0, Math.floor(usage.outputTokens)),
  };
}

export function createMemoryCoachCostController({
  dailyBudgetUsd,
  inputUsdPerMillion,
  outputUsdPerMillion,
  reservedInputTokens,
  reservedOutputTokens,
  now = () => new Date(),
}: CostControllerOptions): CoachCostController {
  const reservationCost = calculateCost(
    {
      inputTokens: reservedInputTokens,
      outputTokens: reservedOutputTokens,
    },
    inputUsdPerMillion,
    outputUsdPerMillion,
  );
  let currentDay = "";
  let resetsAt = 0;
  let spentUsd = 0;
  let inputTokens = 0;
  let outputTokens = 0;
  let reservationSequence = 0;
  const reservations = new Set<string>();

  function resetIfNeeded() {
    const currentDate = now();
    const nextDay = dayKey(currentDate);

    if (nextDay !== currentDay) {
      currentDay = nextDay;
      resetsAt = nextUtcDay(currentDate);
      spentUsd = 0;
      inputTokens = 0;
      outputTokens = 0;
      reservations.clear();
    }
  }

  function reservedUsd() {
    return reservations.size * reservationCost;
  }

  return {
    tryStart() {
      resetIfNeeded();

      if (spentUsd + reservedUsd() + reservationCost > dailyBudgetUsd) {
        return null;
      }

      const reservationId = `${currentDay}:${reservationSequence += 1}`;
      reservations.add(reservationId);
      return reservationId;
    },

    complete(reservationId, usage) {
      resetIfNeeded();

      if (!reservations.delete(reservationId)) {
        return;
      }

      const chargedUsage = normalizeUsage(usage ?? {
        inputTokens: reservedInputTokens,
        outputTokens: reservedOutputTokens,
      });
      inputTokens += chargedUsage.inputTokens;
      outputTokens += chargedUsage.outputTokens;
      spentUsd += calculateCost(
        chargedUsage,
        inputUsdPerMillion,
        outputUsdPerMillion,
      );
    },

    cancel(reservationId) {
      resetIfNeeded();
      reservations.delete(reservationId);
    },

    getSnapshot() {
      resetIfNeeded();
      const currentReservedUsd = reservedUsd();

      return {
        budgetUsd: dailyBudgetUsd,
        spentUsd,
        reservedUsd: currentReservedUsd,
        remainingUsd: Math.max(
          0,
          dailyBudgetUsd - spentUsd - currentReservedUsd,
        ),
        inputTokens,
        outputTokens,
        resetsAt,
      };
    },
  };
}

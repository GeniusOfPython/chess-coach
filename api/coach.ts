import {
  createAiCoachEndpoint,
  createCachedCoachProvider,
  createMemoryRateLimiter,
  createOpenAiCoachProvider,
} from "../server/aiCoachServer";
import {
  combineCoachQuotaConsumers,
  createMemoryCoachBudget,
} from "../server/coachBudget";
import {
  createMemoryCoachCostController,
  resolveCoachCostSettings,
} from "../server/coachCostController";

const consumeQuota = combineCoachQuotaConsumers(
  createMemoryRateLimiter({ limit: 5, windowMs: 60_000 }),
  createMemoryCoachBudget({
    resolveTier: () => "free",
    freeDailyLimit: 3,
    premiumMonthlyLimit: 300,
    globalDailyLimit: 500,
  }),
);
let endpoint: ReturnType<typeof createAiCoachEndpoint> | null = null;
const costController = createMemoryCoachCostController(
  resolveCoachCostSettings(process.env),
);

function clientKey(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("cf-connecting-ip") ||
    "anonymous";
}

export default async function coach(request: Request): Promise<Response> {
  const serverEnabled = process.env.AI_COACH_SERVER_ENABLED === "true";
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL;

  if (!serverEnabled || !apiKey || !model) {
    return Response.json(
      { error: "coach_not_configured" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  endpoint ??= createAiCoachEndpoint({
    provider: createCachedCoachProvider(
      createOpenAiCoachProvider({ apiKey, model, costController }),
    ),
    consumeQuota,
  });

  return endpoint(request, clientKey(request));
}

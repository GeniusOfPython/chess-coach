import {
  createAiCoachEndpoint,
  createMemoryRateLimiter,
  createOpenAiCoachProvider,
} from "../server/aiCoachServer";

const consumeQuota = createMemoryRateLimiter({ limit: 5, windowMs: 60_000 });

function clientKey(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("cf-connecting-ip") ||
    "anonymous";
}

export default async function coach(request: Request): Promise<Response> {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL;

  if (!apiKey || !model) {
    return Response.json(
      { error: "coach_not_configured" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  const endpoint = createAiCoachEndpoint({
    provider: createOpenAiCoachProvider({ apiKey, model }),
    consumeQuota,
  });

  return endpoint(request, clientKey(request));
}

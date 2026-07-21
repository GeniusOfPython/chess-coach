import {
  aiCoachContractVersion,
  parseAiCoachResponse,
  type AiCoachRequest,
  type AiCoachResponse,
} from "../src/ai/coachContract";
import { parseVerifiedChessFacts } from "../src/analysis/verifiedChessFacts";
import type {
  CoachCostController,
  CoachTokenUsage,
} from "./coachCostController";
import {
  createAiCoachQuotaHeaders,
  type AiCoachServerQuota,
} from "../src/ai/coachQuotaProtocol";

const maximumRequestBytes = 16_384;
const maximumOutputTokens = 450;

const adviceSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    schemaVersion: { type: "integer", const: aiCoachContractVersion },
    advice: {
      type: "object",
      additionalProperties: false,
      properties: {
        headline: { type: "string" },
        explanation: { type: "string" },
        focusPoints: {
          type: "array",
          items: { type: "string" },
        },
        warning: {
          anyOf: [
            { type: "string" },
            { type: "null" },
          ],
        },
        question: { type: "string" },
        grounding: {
          type: "object",
          additionalProperties: false,
          properties: {
            factIds: {
              type: "array",
              items: { type: "string" },
            },
            variationId: {
              anyOf: [
                { type: "string" },
                { type: "null" },
              ],
            },
          },
          required: ["factIds", "variationId"],
        },
      },
      required: [
        "headline",
        "explanation",
        "focusPoints",
        "warning",
        "question",
        "grounding",
      ],
    },
  },
  required: ["schemaVersion", "advice"],
} as const;

export type CoachProvider = (request: AiCoachRequest) => Promise<AiCoachResponse>;

export type QuotaReason = "burst" | "daily" | "monthly" | "global";

export type QuotaDecision = {
  allowed: boolean;
  retryAfterSeconds?: number;
  reason?: QuotaReason;
  remaining?: number;
  quota?: AiCoachServerQuota;
  commit?: () => Promise<void> | void;
  release?: () => Promise<void> | void;
};

export type ConsumeCoachQuota = (
  clientKey: string,
) => Promise<QuotaDecision> | QuotaDecision;

type EndpointDependencies = {
  provider: CoachProvider;
  consumeQuota: ConsumeCoachQuota;
};

type OpenAiProviderOptions = {
  apiKey: string;
  model: string;
  timeoutMs?: number;
  fetcher?: typeof fetch;
  costController?: CoachCostController;
};

type RateLimitOptions = {
  limit?: number;
  windowMs?: number;
};

type CacheOptions = {
  ttlMs?: number;
  maximumEntries?: number;
  now?: () => number;
};

class CoachServerError extends Error {
  readonly status: number;
  readonly publicCode: string;

  constructor(message: string, status: number, publicCode: string) {
    super(message);
    this.name = "CoachServerError";
    this.status = status;
    this.publicCode = publicCode;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseAiCoachRequest(value: unknown): AiCoachRequest {
  if (
    !isRecord(value) ||
    value.schemaVersion !== aiCoachContractVersion ||
    value.locale !== "ru" ||
    !isRecord(value.facts)
  ) {
    throw new CoachServerError("Invalid request contract", 400, "invalid_request");
  }

  try {
    return {
      schemaVersion: aiCoachContractVersion,
      locale: "ru",
      facts: parseVerifiedChessFacts(value.facts),
    };
  } catch {
    throw new CoachServerError("Invalid verified facts", 400, "invalid_request");
  }
}

function jsonResponse(
  body: unknown,
  status: number,
  headers?: HeadersInit,
) {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      ...headers,
    },
  });
}

async function readRequest(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";

  if (!contentType.toLowerCase().startsWith("application/json")) {
    throw new CoachServerError("JSON required", 415, "unsupported_media_type");
  }

  const declaredLength = Number(request.headers.get("content-length"));

  if (Number.isFinite(declaredLength) && declaredLength > maximumRequestBytes) {
    throw new CoachServerError("Request too large", 413, "request_too_large");
  }

  const text = await request.text();

  if (new TextEncoder().encode(text).byteLength > maximumRequestBytes) {
    throw new CoachServerError("Request too large", 413, "request_too_large");
  }

  try {
    return parseAiCoachRequest(JSON.parse(text) as unknown);
  } catch (error) {
    if (error instanceof CoachServerError) {
      throw error;
    }

    throw new CoachServerError("Malformed JSON", 400, "invalid_request");
  }
}

export function createAiCoachEndpoint({
  provider,
  consumeQuota,
}: EndpointDependencies) {
  return async function handleAiCoachRequest(
    request: Request,
    clientKey = "anonymous",
  ): Promise<Response> {
    if (request.method !== "POST") {
      return jsonResponse(
        { error: "method_not_allowed" },
        405,
        { Allow: "POST" },
      );
    }

    try {
      const coachRequest = await readRequest(request);
      const quota = await consumeQuota(clientKey);

      if (!quota.allowed) {
        const retryAfter = Math.max(1, Math.ceil(quota.retryAfterSeconds ?? 60));

        return jsonResponse(
          {
            error: "rate_limited",
            reason: quota.reason ?? "burst",
          },
          429,
          {
            "Retry-After": String(retryAfter),
            ...(quota.quota ? createAiCoachQuotaHeaders(quota.quota) : {}),
          },
        );
      }

      try {
        const response = parseAiCoachResponse(
          await provider(coachRequest),
          coachRequest,
        );
        await quota.commit?.();
        return jsonResponse(
          response,
          200,
          quota.quota ? createAiCoachQuotaHeaders(quota.quota) : undefined,
        );
      } catch (error) {
        await quota.release?.();
        throw error;
      }
    } catch (error) {
      if (error instanceof CoachServerError) {
        return jsonResponse({ error: error.publicCode }, error.status);
      }

      return jsonResponse({ error: "coach_unavailable" }, 503);
    }
  };
}

function extractOutputText(value: unknown) {
  if (!isRecord(value) || !Array.isArray(value.output)) {
    return null;
  }

  for (const item of value.output) {
    if (!isRecord(item) || !Array.isArray(item.content)) {
      continue;
    }

    for (const content of item.content) {
      if (
        isRecord(content) &&
        content.type === "output_text" &&
        typeof content.text === "string"
      ) {
        return content.text;
      }
    }
  }

  return null;
}

function extractTokenUsage(value: unknown): CoachTokenUsage | undefined {
  if (!isRecord(value) || !isRecord(value.usage)) {
    return undefined;
  }

  const inputTokens = value.usage.input_tokens;
  const outputTokens = value.usage.output_tokens;

  if (
    typeof inputTokens !== "number" ||
    !Number.isFinite(inputTokens) ||
    inputTokens < 0 ||
    typeof outputTokens !== "number" ||
    !Number.isFinite(outputTokens) ||
    outputTokens < 0
  ) {
    return undefined;
  }

  return { inputTokens, outputTokens };
}

export function createOpenAiCoachProvider({
  apiKey,
  model,
  timeoutMs = 12_000,
  fetcher = fetch,
  costController,
}: OpenAiProviderOptions): CoachProvider {
  if (!apiKey || !model) {
    throw new Error("OPENAI_API_KEY and OPENAI_MODEL are required");
  }

  return async (request) => {
    const reservationId = costController?.tryStart();

    if (costController && !reservationId) {
      throw new CoachServerError(
        "AI Coach daily cost budget exhausted",
        503,
        "coach_budget_exhausted",
      );
    }

    const controller = new AbortController();
    const timer = globalThis.setTimeout(() => controller.abort(), timeoutMs);
    let providerResponded = false;
    let costSettled = false;

    try {
      const response = await fetcher("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          store: false,
          max_output_tokens: maximumOutputTokens,
          instructions: [
            "Ты русскоязычный шахматный тренер.",
            "Шахматный расчёт уже определил лучший ход: не предлагай вместо него другой.",
            "Каждое шахматное утверждение основывай только на facts и укажи использованные factIds в grounding.",
            "Не придумывай ходы и варианты. variationId может ссылаться только на один из переданных проверенных вариантов.",
            "Объясняй позицию кратко и понятно, без markdown и лишней терминологии.",
            "Не утверждай, что видишь данные, которых нет во входном JSON.",
          ].join(" "),
          input: JSON.stringify(request),
          text: {
            format: {
              type: "json_schema",
              name: "chess_coach_advice",
              strict: true,
              schema: adviceSchema,
            },
          },
        }),
        signal: controller.signal,
      });
      providerResponded = true;

      if (!response.ok) {
        if (reservationId) {
          costController?.complete(reservationId);
          costSettled = true;
        }

        const providerConfigurationError =
          response.status === 400 ||
          response.status === 401 ||
          response.status === 403 ||
          response.status === 404;

        throw new CoachServerError(
          "OpenAI request failed",
          response.status === 429 ? 429 : 503,
          response.status === 429
            ? "provider_rate_limited"
            : providerConfigurationError
              ? "provider_configuration_error"
              : "coach_unavailable",
        );
      }

      const responseBody = await response.json() as unknown;

      if (reservationId) {
        costController?.complete(
          reservationId,
          extractTokenUsage(responseBody),
        );
        costSettled = true;
      }

      const outputText = extractOutputText(responseBody);

      if (!outputText) {
        throw new CoachServerError("Empty OpenAI response", 503, "coach_unavailable");
      }

      return parseAiCoachResponse(JSON.parse(outputText) as unknown, request);
    } catch (error) {
      if (error instanceof CoachServerError) {
        throw error;
      }

      if (controller.signal.aborted) {
        throw new CoachServerError("OpenAI timeout", 504, "coach_timeout");
      }

      throw new CoachServerError("Invalid OpenAI response", 503, "coach_unavailable");
    } finally {
      if (reservationId && !costSettled) {
        if (providerResponded) {
          costController?.complete(reservationId);
        } else {
          costController?.cancel(reservationId);
        }
      }

      globalThis.clearTimeout(timer);
    }
  };
}

export function createMemoryRateLimiter({
  limit = 5,
  windowMs = 60_000,
}: RateLimitOptions = {}): ConsumeCoachQuota {
  const buckets = new Map<string, { count: number; resetsAt: number }>();

  return (clientKey) => {
    const now = Date.now();
    const existing = buckets.get(clientKey);
    const bucket = !existing || existing.resetsAt <= now
      ? { count: 0, resetsAt: now + windowMs }
      : existing;

    if (bucket.count >= limit) {
      return {
        allowed: false,
        reason: "burst",
        retryAfterSeconds: Math.ceil((bucket.resetsAt - now) / 1_000),
      };
    }

    bucket.count += 1;
    buckets.set(clientKey, bucket);
    return { allowed: true };
  };
}

export function createCachedCoachProvider(
  provider: CoachProvider,
  {
    ttlMs = 60 * 60 * 1_000,
    maximumEntries = 250,
    now = Date.now,
  }: CacheOptions = {},
): CoachProvider {
  const responses = new Map<
    string,
    { expiresAt: number; response: AiCoachResponse }
  >();
  const pending = new Map<string, Promise<AiCoachResponse>>();

  return async (request) => {
    const cacheKey = JSON.stringify(request);
    const currentTime = now();
    const cached = responses.get(cacheKey);

    if (cached && cached.expiresAt > currentTime) {
      return cached.response;
    }

    responses.delete(cacheKey);
    const existingRequest = pending.get(cacheKey);

    if (existingRequest) {
      return existingRequest;
    }

    const providerRequest = provider(request)
      .then((response) => {
        responses.set(cacheKey, {
          response,
          expiresAt: now() + ttlMs,
        });

        while (responses.size > maximumEntries) {
          const oldestKey = responses.keys().next().value;

          if (typeof oldestKey !== "string") {
            break;
          }

          responses.delete(oldestKey);
        }

        return response;
      })
      .finally(() => pending.delete(cacheKey));

    pending.set(cacheKey, providerRequest);
    return providerRequest;
  };
}

import { Chess } from "chess.js";
import {
  aiCoachContractVersion,
  parseAiCoachResponse,
  type AiCoachRequest,
  type AiCoachResponse,
} from "../src/ai/coachContract";

const maximumRequestBytes = 16_384;
const movePattern = /^[a-h][1-8][a-h][1-8][qrbn]?$/;

const adviceSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    schemaVersion: { type: "integer", const: aiCoachContractVersion },
    advice: {
      type: "object",
      additionalProperties: false,
      properties: {
        headline: { type: "string", minLength: 1, maxLength: 120 },
        explanation: { type: "string", minLength: 1, maxLength: 700 },
        focusPoints: {
          type: "array",
          minItems: 1,
          maxItems: 3,
          items: { type: "string", minLength: 1, maxLength: 180 },
        },
        warning: {
          anyOf: [
            { type: "string", minLength: 1, maxLength: 240 },
            { type: "null" },
          ],
        },
        question: { type: "string", minLength: 1, maxLength: 240 },
      },
      required: [
        "headline",
        "explanation",
        "focusPoints",
        "warning",
        "question",
      ],
    },
  },
  required: ["schemaVersion", "advice"],
} as const;

type CoachProvider = (request: AiCoachRequest) => Promise<AiCoachResponse>;

export type QuotaDecision = {
  allowed: boolean;
  retryAfterSeconds?: number;
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
};

type RateLimitOptions = {
  limit?: number;
  windowMs?: number;
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

function isNullableFiniteNumber(value: unknown) {
  return value === null || (typeof value === "number" && Number.isFinite(value));
}

function isEngineLine(value: unknown) {
  return isRecord(value) &&
    typeof value.rank === "number" &&
    Number.isInteger(value.rank) &&
    value.rank >= 1 &&
    Array.isArray(value.variation) &&
    value.variation.length <= 8 &&
    value.variation.every(
      (move) => typeof move === "string" && movePattern.test(move),
    );
}

export function parseAiCoachRequest(value: unknown): AiCoachRequest {
  if (
    !isRecord(value) ||
    value.schemaVersion !== aiCoachContractVersion ||
    value.locale !== "ru" ||
    !isRecord(value.position) ||
    !isRecord(value.engine)
  ) {
    throw new CoachServerError("Invalid request contract", 400, "invalid_request");
  }

  const { position, engine } = value;

  if (
    typeof position.fen !== "string" ||
    position.fen.length > 100 ||
    (position.sideToMove !== "white" && position.sideToMove !== "black") ||
    typeof position.fullMoveNumber !== "number" ||
    !Number.isInteger(position.fullMoveNumber) ||
    position.fullMoveNumber < 1 ||
    typeof engine.bestMove !== "string" ||
    !movePattern.test(engine.bestMove) ||
    !isNullableFiniteNumber(engine.evaluation) ||
    !isNullableFiniteNumber(engine.mate) ||
    typeof engine.depth !== "number" ||
    !Number.isInteger(engine.depth) ||
    engine.depth < 0 ||
    engine.depth > 100 ||
    !Array.isArray(engine.lines) ||
    engine.lines.length > 3 ||
    !engine.lines.every(isEngineLine)
  ) {
    throw new CoachServerError("Invalid request fields", 400, "invalid_request");
  }

  let game: Chess;

  try {
    game = new Chess(position.fen);
  } catch {
    throw new CoachServerError("Invalid FEN", 400, "invalid_request");
  }

  const normalizedFen = game.fen();
  const normalizedFullMove = Number(normalizedFen.split(" ")[5]);
  const normalizedSide = game.turn() === "w" ? "white" : "black";

  if (
    position.fen !== normalizedFen ||
    position.sideToMove !== normalizedSide ||
    position.fullMoveNumber !== normalizedFullMove
  ) {
    throw new CoachServerError("Inconsistent position", 400, "invalid_request");
  }

  return value as AiCoachRequest;
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
          { error: "rate_limited" },
          429,
          { "Retry-After": String(retryAfter) },
        );
      }

      const response = parseAiCoachResponse(await provider(coachRequest));
      return jsonResponse(response, 200);
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

export function createOpenAiCoachProvider({
  apiKey,
  model,
  timeoutMs = 12_000,
  fetcher = fetch,
}: OpenAiProviderOptions): CoachProvider {
  if (!apiKey || !model) {
    throw new Error("OPENAI_API_KEY and OPENAI_MODEL are required");
  }

  return async (request) => {
    const controller = new AbortController();
    const timer = globalThis.setTimeout(() => controller.abort(), timeoutMs);

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
          instructions: [
            "Ты русскоязычный шахматный тренер.",
            "Stockfish уже выбрал лучший ход: не предлагай вместо него другой.",
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

      if (!response.ok) {
        throw new CoachServerError(
          "OpenAI request failed",
          response.status === 429 ? 429 : 503,
          response.status === 429 ? "provider_rate_limited" : "coach_unavailable",
        );
      }

      const outputText = extractOutputText(await response.json());

      if (!outputText) {
        throw new CoachServerError("Empty OpenAI response", 503, "coach_unavailable");
      }

      return parseAiCoachResponse(JSON.parse(outputText) as unknown);
    } catch (error) {
      if (error instanceof CoachServerError) {
        throw error;
      }

      if (controller.signal.aborted) {
        throw new CoachServerError("OpenAI timeout", 504, "coach_timeout");
      }

      throw new CoachServerError("Invalid OpenAI response", 503, "coach_unavailable");
    } finally {
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
        retryAfterSeconds: Math.ceil((bucket.resetsAt - now) / 1_000),
      };
    }

    bucket.count += 1;
    buckets.set(clientKey, bucket);
    return { allowed: true };
  };
}

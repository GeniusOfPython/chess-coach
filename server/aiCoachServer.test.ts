import { describe, expect, it, vi } from "vitest";
import type { AiCoachRequest, AiCoachResponse } from "../src/ai/coachContract";
import {
  createAiCoachEndpoint,
  createMemoryRateLimiter,
  createOpenAiCoachProvider,
} from "./aiCoachServer";

const coachRequest = {
  schemaVersion: 1,
  locale: "ru",
  position: {
    fen: "8/8/8/8/8/8/4K3/7k w - - 0 1",
    sideToMove: "white",
    fullMoveNumber: 1,
  },
  engine: {
    bestMove: "e2e3",
    evaluation: 0,
    mate: null,
    depth: 12,
    lines: [{ rank: 1, variation: ["e2e3"] }],
  },
} satisfies AiCoachRequest;

const coachResponse = {
  schemaVersion: 1,
  advice: {
    headline: "Активируй короля",
    explanation: "В эндшпиле король должен участвовать в игре.",
    focusPoints: ["Централизация"],
    warning: null,
    question: "К какому полю направить короля?",
  },
} satisfies AiCoachResponse;

function post(body: unknown) {
  return new Request("https://example.test/api/coach", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("AI Coach endpoint", () => {
  it("возвращает проверенный ответ провайдера", async () => {
    const provider = vi.fn(async () => coachResponse);
    const endpoint = createAiCoachEndpoint({
      provider,
      consumeQuota: () => ({ allowed: true }),
    });

    const response = await endpoint(post(coachRequest), "client-1");

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(coachResponse);
    expect(provider).toHaveBeenCalledWith(coachRequest);
  });

  it("отклоняет некорректный контракт до вызова провайдера", async () => {
    const provider = vi.fn(async () => coachResponse);
    const endpoint = createAiCoachEndpoint({
      provider,
      consumeQuota: () => ({ allowed: true }),
    });

    const response = await endpoint(post({ ...coachRequest, schemaVersion: 2 }));

    expect(response.status).toBe(400);
    expect(provider).not.toHaveBeenCalled();
  });

  it("применяет лимит отдельно для каждого клиента", async () => {
    const endpoint = createAiCoachEndpoint({
      provider: async () => coachResponse,
      consumeQuota: createMemoryRateLimiter({ limit: 1 }),
    });

    expect((await endpoint(post(coachRequest), "client-1")).status).toBe(200);
    const limited = await endpoint(post(coachRequest), "client-1");
    expect(limited.status).toBe(429);
    expect(limited.headers.get("Retry-After")).toBeTruthy();
    expect((await endpoint(post(coachRequest), "client-2")).status).toBe(200);
  });
});

describe("OpenAI Coach provider", () => {
  it("запрашивает строгую схему и разбирает output_text", async () => {
    let capturedInit: RequestInit | undefined;
    const fetcher: typeof fetch = vi.fn(async (_input, init) => {
      capturedInit = init;
      return Response.json({
        output: [{
          type: "message",
          content: [{
            type: "output_text",
            text: JSON.stringify(coachResponse),
          }],
        }],
      });
    });
    const provider = createOpenAiCoachProvider({
      apiKey: "server-secret",
      model: "test-model",
      fetcher,
    });

    await expect(provider(coachRequest)).resolves.toEqual(coachResponse);

    const body = JSON.parse(String(capturedInit?.body)) as {
      store: boolean;
      text: { format: { strict: boolean; type: string } };
    };
    expect(body.store).toBe(false);
    expect(body.text.format).toMatchObject({
      type: "json_schema",
      strict: true,
    });
    expect(capturedInit?.headers).toMatchObject({
      Authorization: "Bearer server-secret",
    });
  });
});

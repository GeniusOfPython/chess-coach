import { describe, expect, it } from "vitest";
import { createAiCoachRequest } from "./coachContract";
import { createVerifiedChessFacts } from "../analysis/verifiedChessFacts";
import { AiCoachError, AiCoachService } from "./AiCoachService";

const request = createAiCoachRequest(createVerifiedChessFacts({
  fen: "8/8/8/8/8/8/4K3/7k w - - 0 1",
  analysis: {
    rank: 1,
    bestMove: "e2e3",
    evaluation: 0,
    mate: null,
    depth: 12,
    variation: ["e2e3"],
    lines: [{
      rank: 1,
      bestMove: "e2e3",
      evaluation: 0,
      mate: null,
      depth: 12,
      variation: ["e2e3"],
    }],
  },
}));

const validResponse = {
  schemaVersion: 2,
  advice: {
    headline: "Улучши короля",
    explanation: "Активный король важен в эндшпиле.",
    focusPoints: ["Централизация"],
    warning: null,
    question: "Куда направится король?",
    grounding: {
      factIds: ["recommendation.best-move"],
      variationId: "variation.1",
    },
  },
};

describe("AiCoachService", () => {
  it("возвращает проверенный совет сервера", async () => {
    const service = new AiCoachService({
      fetcher: async () => Response.json(validResponse),
    });

    await expect(service.getAdvice(request)).resolves.toEqual({
      advice: validResponse.advice,
      quota: null,
    });
  });

  it("читает серверную квоту из проверенных заголовков", async () => {
    const service = new AiCoachService({
      fetcher: async () => Response.json(validResponse, {
        headers: {
          "X-AI-Coach-Quota-Tier": "premium",
          "X-AI-Coach-Quota-Period": "month",
          "X-AI-Coach-Quota-Limit": "300",
          "X-AI-Coach-Quota-Remaining": "299",
        },
      }),
    });

    await expect(service.getAdvice(request)).resolves.toMatchObject({
      quota: {
        tier: "premium",
        period: "month",
        limit: 300,
        remaining: 299,
      },
    });
  });

  it("преобразует rate limit в доменную ошибку", async () => {
    const service = new AiCoachService({
      fetcher: async () => new Response(null, { status: 429 }),
    });

    await expect(service.getAdvice(request)).rejects.toMatchObject({
      code: "rate_limited",
    } satisfies Partial<AiCoachError>);
  });

  it("отличает пользовательскую квоту от временного rate limit", async () => {
    const service = new AiCoachService({
      fetcher: async () => Response.json(
        { error: "rate_limited", reason: "monthly" },
        { status: 429 },
      ),
    });

    await expect(service.getAdvice(request)).rejects.toMatchObject({
      code: "quota_exhausted",
    } satisfies Partial<AiCoachError>);
  });

  it("передаёт актуальный остаток вместе с ошибкой квоты", async () => {
    const service = new AiCoachService({
      fetcher: async () => Response.json(
        { error: "rate_limited", reason: "daily" },
        {
          status: 429,
          headers: {
            "X-AI-Coach-Quota-Tier": "free",
            "X-AI-Coach-Quota-Period": "day",
            "X-AI-Coach-Quota-Limit": "3",
            "X-AI-Coach-Quota-Remaining": "0",
          },
        },
      ),
    });

    await expect(service.getAdvice(request)).rejects.toMatchObject({
      code: "quota_exhausted",
      quota: {
        tier: "free",
        period: "day",
        remaining: 0,
        limit: 3,
      },
    } satisfies Partial<AiCoachError>);
  });

  it("не пропускает ответ вне контракта", async () => {
    const service = new AiCoachService({
      fetcher: async () => Response.json({ advice: {} }),
    });

    await expect(service.getAdvice(request)).rejects.toMatchObject({
      code: "invalid_response",
    } satisfies Partial<AiCoachError>);
  });

  it("отличает ошибку настройки провайдера от временного сбоя", async () => {
    const service = new AiCoachService({
      fetcher: async () => Response.json(
        { error: "provider_configuration_error" },
        { status: 503 },
      ),
    });

    await expect(service.getAdvice(request)).rejects.toMatchObject({
      code: "configuration",
    } satisfies Partial<AiCoachError>);
  });
});

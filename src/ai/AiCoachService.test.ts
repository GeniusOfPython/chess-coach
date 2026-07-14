import { describe, expect, it } from "vitest";
import type { AiCoachRequest } from "./coachContract";
import { AiCoachError, AiCoachService } from "./AiCoachService";

const request = {
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

const validResponse = {
  schemaVersion: 1,
  advice: {
    headline: "Улучши короля",
    explanation: "Активный король важен в эндшпиле.",
    focusPoints: ["Централизация"],
    warning: null,
    question: "Куда направится король?",
  },
};

describe("AiCoachService", () => {
  it("возвращает проверенный совет сервера", async () => {
    const service = new AiCoachService({
      fetcher: async () => Response.json(validResponse),
    });

    await expect(service.getAdvice(request)).resolves.toEqual(
      validResponse.advice,
    );
  });

  it("преобразует rate limit в доменную ошибку", async () => {
    const service = new AiCoachService({
      fetcher: async () => new Response(null, { status: 429 }),
    });

    await expect(service.getAdvice(request)).rejects.toMatchObject({
      code: "rate_limited",
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
});

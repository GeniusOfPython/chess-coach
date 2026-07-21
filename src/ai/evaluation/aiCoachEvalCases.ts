import { createVerifiedChessFacts } from "../../analysis/verifiedChessFacts";
import type { EngineAnalysis } from "../../types/chess";
import {
  createAiCoachRequest,
  type AiCoachResponse,
} from "../coachContract";
import type { AiCoachEvalCase } from "./aiCoachEval";

type PositionFixture = {
  id: string;
  title: string;
  fen: string;
  analysis: EngineAnalysis;
};

const positions: PositionFixture[] = [
  {
    id: "opening-development",
    title: "Развитие в дебюте",
    fen: "rn1qkbnr/pppb1ppp/3pp3/8/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 4",
    analysis: {
      rank: 1,
      bestMove: "f1b5",
      evaluation: 0.35,
      mate: null,
      depth: 16,
      variation: ["f1b5", "b8c6", "e1g1"],
      lines: [],
    },
  },
  {
    id: "forced-capture",
    title: "Ответ на шах с разменом ферзей",
    fen: "4k3/8/8/8/8/8/4q3/3QK3 w - - 0 1",
    analysis: {
      rank: 1,
      bestMove: "d1e2",
      evaluation: 5.2,
      mate: null,
      depth: 18,
      variation: ["d1e2", "e8f7"],
      lines: [],
    },
  },
  {
    id: "promotion",
    title: "Превращение проходной пешки",
    fen: "7k/P7/8/8/8/8/8/7K w - - 0 1",
    analysis: {
      rank: 1,
      bestMove: "a7a8q",
      evaluation: 8.7,
      mate: null,
      depth: 20,
      variation: ["a7a8q", "h8g7"],
      lines: [],
    },
  },
  {
    id: "black-promotion",
    title: "Решение за чёрных",
    fen: "7K/8/8/8/8/2k5/7p/8 b - - 0 1",
    analysis: {
      rank: 1,
      bestMove: "h2h1q",
      evaluation: 9.1,
      mate: null,
      depth: 20,
      variation: ["h2h1q", "h8g7"],
      lines: [],
    },
  },
];

const requests = new Map(
  positions.map((position) => [
    position.id,
    createAiCoachRequest(createVerifiedChessFacts({
      fen: position.fen,
      analysis: position.analysis,
    })),
  ]),
);

function getRequest(positionId: string) {
  const request = requests.get(positionId);

  if (!request) {
    throw new Error(`Неизвестная eval-позиция: ${positionId}`);
  }

  return request;
}

function validResponse(
  positionId: string,
  explanation: string,
): AiCoachResponse {
  const request = getRequest(positionId);
  const factIds = request.facts.facts
    .filter((fact) =>
      fact.id === "recommendation.best-move" || fact.category === "move-effect"
    )
    .slice(0, 3)
    .map((fact) => fact.id);

  return {
    schemaVersion: 2,
    advice: {
      headline: "Проверь форсированный ход",
      explanation,
      focusPoints: ["Сначала проверь шахи, взятия и прямые угрозы"],
      warning: null,
      question: "Что изменится в позиции после рекомендованного хода?",
      grounding: {
        factIds,
        variationId: "variation.1",
      },
    },
  };
}

const openingResponse = validResponse(
  "opening-development",
  "Ход f1b5 развивает слона и сохраняет возможность быстрой рокировки.",
);
const captureResponse = validResponse(
  "forced-capture",
  "Ход d1e2 отвечает на шах и убирает атакующего ферзя.",
);
const promotionResponse = validResponse(
  "promotion",
  "Ход a7a8q превращает проходную пешку в ферзя.",
);
const blackPromotionResponse = validResponse(
  "black-promotion",
  "Ход h2h1q использует очередь хода чёрных и превращает пешку.",
);

function cloneResponse(response: AiCoachResponse) {
  return structuredClone(response);
}

const inventedMove = cloneResponse(openingResponse);
inventedMove.advice.explanation = "Ход f1c4 немедленно выигрывает материал.";

const unknownFact = cloneResponse(captureResponse);
unknownFact.advice.grounding.factIds.push("motif.invented");

const unknownVariation = cloneResponse(promotionResponse);
unknownVariation.advice.grounding.variationId = "variation.99";

const missingBestMoveGrounding = cloneResponse(blackPromotionResponse);
missingBestMoveGrounding.advice.grounding.factIds = ["position.phase"];

const duplicateGrounding = cloneResponse(openingResponse);
duplicateGrounding.advice.grounding.factIds = [
  "recommendation.best-move",
  "recommendation.best-move",
];

const brokenSchema = cloneResponse(captureResponse) as unknown as {
  schemaVersion: number;
  advice: Record<string, unknown>;
};
delete brokenSchema.advice.question;

export const aiCoachEvalCases: AiCoachEvalCase[] = [
  {
    id: "accept-opening-grounded",
    title: "Принимает объяснение дебютного развития",
    request: getRequest("opening-development"),
    candidate: openingResponse,
    expected: "accept",
    risk: "grounding",
    requiredFactIds: ["recommendation.best-move"],
    requiredVariationId: "variation.1",
  },
  {
    id: "accept-forced-capture-grounded",
    title: "Принимает объяснение форсированного взятия",
    request: getRequest("forced-capture"),
    candidate: captureResponse,
    expected: "accept",
    risk: "grounding",
    requiredFactIds: ["recommendation.best-move"],
  },
  {
    id: "accept-promotion-variation",
    title: "Принимает проверенную линию превращения",
    request: getRequest("promotion"),
    candidate: promotionResponse,
    expected: "accept",
    risk: "variation",
    requiredVariationId: "variation.1",
  },
  {
    id: "accept-black-side-grounded",
    title: "Корректно обрабатывает ход чёрных",
    request: getRequest("black-promotion"),
    candidate: blackPromotionResponse,
    expected: "accept",
    risk: "grounding",
    requiredFactIds: ["recommendation.best-move"],
  },
  {
    id: "reject-invented-move",
    title: "Блокирует придуманный координатный ход",
    request: getRequest("opening-development"),
    candidate: inventedMove,
    expected: "reject",
    risk: "unsupported-move",
  },
  {
    id: "reject-unknown-fact",
    title: "Блокирует ссылку на отсутствующий факт",
    request: getRequest("forced-capture"),
    candidate: unknownFact,
    expected: "reject",
    risk: "grounding",
  },
  {
    id: "reject-unknown-variation",
    title: "Блокирует отсутствующий вариант",
    request: getRequest("promotion"),
    candidate: unknownVariation,
    expected: "reject",
    risk: "variation",
  },
  {
    id: "reject-missing-best-move-grounding",
    title: "Блокирует ответ без основания лучшего хода",
    request: getRequest("black-promotion"),
    candidate: missingBestMoveGrounding,
    expected: "reject",
    risk: "grounding",
  },
  {
    id: "reject-duplicate-grounding",
    title: "Блокирует дублирующиеся основания",
    request: getRequest("opening-development"),
    candidate: duplicateGrounding,
    expected: "reject",
    risk: "schema",
  },
  {
    id: "reject-broken-schema",
    title: "Блокирует неполный структурированный ответ",
    request: getRequest("forced-capture"),
    candidate: brokenSchema,
    expected: "reject",
    risk: "schema",
  },
];

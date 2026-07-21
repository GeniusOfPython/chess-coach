import {
  getAllowedVerifiedMoves,
  parseVerifiedChessFacts,
  type VerifiedChessFacts,
} from "../analysis/verifiedChessFacts";

export const aiCoachContractVersion = 2 as const;

export type AiCoachRequest = {
  schemaVersion: typeof aiCoachContractVersion;
  locale: "ru";
  facts: VerifiedChessFacts;
};

export type AiCoachGrounding = {
  factIds: string[];
  variationId: string | null;
};

export type AiCoachAdvice = {
  headline: string;
  explanation: string;
  focusPoints: string[];
  warning: string | null;
  question: string;
  grounding: AiCoachGrounding;
};

export type AiCoachResponse = {
  schemaVersion: typeof aiCoachContractVersion;
  advice: AiCoachAdvice;
};

export function createAiCoachRequest(
  facts: VerifiedChessFacts,
): AiCoachRequest {
  return {
    schemaVersion: aiCoachContractVersion,
    locale: "ru",
    facts: parseVerifiedChessFacts(facts),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readText(
  value: unknown,
  fieldName: string,
  maximumLength: number,
) {
  if (typeof value !== "string") {
    throw new Error(`ИИ-тренер вернул некорректное поле ${fieldName}`);
  }

  const text = value.trim();

  if (!text || text.length > maximumLength) {
    throw new Error(`ИИ-тренер вернул некорректное поле ${fieldName}`);
  }

  return text;
}

function getResponseText(advice: AiCoachAdvice) {
  return [
    advice.headline,
    advice.explanation,
    ...advice.focusPoints,
    advice.warning ?? "",
    advice.question,
  ].join(" ");
}

function assertNoUnsupportedMoves(
  advice: AiCoachAdvice,
  facts: VerifiedChessFacts,
) {
  const allowedMoves = getAllowedVerifiedMoves(facts);
  const text = getResponseText(advice);
  const compactMoves = text.match(/\b[a-h][1-8][a-h][1-8][qrbn]?\b/gi) ?? [];
  const arrowMoves = Array.from(
    text.matchAll(/\b([a-h][1-8])\s*(?:→|->|—|-)\s*([a-h][1-8])(?:=([qrbn]))?/gi),
    (match) => `${match[1]}${match[2]}${match[3] ?? ""}`.toLowerCase(),
  );

  if (
    [...compactMoves.map((move) => move.toLowerCase()), ...arrowMoves]
      .some((move) => !allowedMoves.has(move))
  ) {
    throw new Error("ИИ-тренер добавил неподтверждённый вариант");
  }
}

export function parseAiCoachResponse(
  value: unknown,
  request: AiCoachRequest,
): AiCoachResponse {
  if (
    !isRecord(value) ||
    value.schemaVersion !== aiCoachContractVersion ||
    !isRecord(value.advice) ||
    !isRecord(value.advice.grounding)
  ) {
    throw new Error("Ответ ИИ-тренера не соответствует контракту");
  }

  const focusPoints = value.advice.focusPoints;

  if (!Array.isArray(focusPoints) || focusPoints.length < 1 || focusPoints.length > 3) {
    throw new Error("ИИ-тренер вернул некорректные ориентиры");
  }

  const warning = value.advice.warning;
  const grounding = value.advice.grounding;
  const factIds = grounding.factIds;

  if (
    !Array.isArray(factIds) ||
    factIds.length < 1 ||
    factIds.length > 6 ||
    !factIds.every((item) => typeof item === "string") ||
    new Set(factIds).size !== factIds.length
  ) {
    throw new Error("ИИ-тренер не указал основание ответа");
  }

  const verifiedFactIds = new Set(request.facts.facts.map((fact) => fact.id));

  if (
    !factIds.includes("recommendation.best-move") ||
    factIds.some((factId) => !verifiedFactIds.has(factId))
  ) {
    throw new Error("Ответ ИИ-тренера не подтверждён расчётом");
  }

  const variationId = grounding.variationId;

  if (
    variationId !== null &&
    (typeof variationId !== "string" ||
      !request.facts.variations.some((variation) => variation.id === variationId))
  ) {
    throw new Error("ИИ-тренер сослался на неподтверждённый вариант");
  }

  const advice: AiCoachAdvice = {
    headline: readText(value.advice.headline, "headline", 120),
    explanation: readText(value.advice.explanation, "explanation", 700),
    focusPoints: focusPoints.map((item) =>
      readText(item, "focusPoints", 180),
    ),
    warning: warning === null
      ? null
      : readText(warning, "warning", 240),
    question: readText(value.advice.question, "question", 240),
    grounding: {
      factIds: factIds as string[],
      variationId,
    },
  };

  assertNoUnsupportedMoves(advice, request.facts);

  return {
    schemaVersion: aiCoachContractVersion,
    advice,
  };
}

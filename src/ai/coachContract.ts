import { Chess } from "chess.js";
import type { EngineAnalysis, EngineLine } from "../types/chess";

export const aiCoachContractVersion = 1 as const;

export type AiCoachRequest = {
  schemaVersion: typeof aiCoachContractVersion;
  locale: "ru";
  position: {
    fen: string;
    sideToMove: "white" | "black";
    fullMoveNumber: number;
  };
  engine: {
    bestMove: string;
    evaluation: number | null;
    mate: number | null;
    depth: number;
    lines: Array<{
      rank: number;
      variation: string[];
    }>;
  };
};

export type AiCoachAdvice = {
  headline: string;
  explanation: string;
  focusPoints: string[];
  warning: string | null;
  question: string;
};

export type AiCoachResponse = {
  schemaVersion: typeof aiCoachContractVersion;
  advice: AiCoachAdvice;
};

const movePattern = /^[a-h][1-8][a-h][1-8][qrbn]?$/;

function normalizeNumber(value: number | null, limit: number) {
  if (value === null || !Number.isFinite(value)) {
    return null;
  }

  return Math.max(-limit, Math.min(limit, value));
}

function normalizeLine(line: EngineLine) {
  return {
    rank: Math.max(1, Math.round(line.rank)),
    variation: line.variation
      .filter((move) => movePattern.test(move))
      .slice(0, 8),
  };
}

export function createAiCoachRequest({
  fen,
  analysis,
}: {
  fen: string;
  analysis: EngineAnalysis;
}): AiCoachRequest {
  const game = new Chess(fen);

  if (!movePattern.test(analysis.bestMove)) {
    throw new Error("Не удалось проверить рекомендованный ход");
  }

  const fullMoveNumber = Number(game.fen().split(" ")[5]);

  return {
    schemaVersion: aiCoachContractVersion,
    locale: "ru",
    position: {
      fen: game.fen(),
      sideToMove: game.turn() === "w" ? "white" : "black",
      fullMoveNumber: Number.isFinite(fullMoveNumber) ? fullMoveNumber : 1,
    },
    engine: {
      bestMove: analysis.bestMove,
      evaluation: normalizeNumber(analysis.evaluation, 100),
      mate: normalizeNumber(analysis.mate, 100),
      depth: Math.max(0, Math.round(analysis.depth)),
      lines: analysis.lines.slice(0, 3).map(normalizeLine),
    },
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

export function parseAiCoachResponse(value: unknown): AiCoachResponse {
  if (
    !isRecord(value) ||
    value.schemaVersion !== aiCoachContractVersion ||
    !isRecord(value.advice)
  ) {
    throw new Error("Ответ ИИ-тренера не соответствует контракту");
  }

  const focusPoints = value.advice.focusPoints;

  if (!Array.isArray(focusPoints) || focusPoints.length < 1 || focusPoints.length > 3) {
    throw new Error("ИИ-тренер вернул некорректные ориентиры");
  }

  const warning = value.advice.warning;

  return {
    schemaVersion: aiCoachContractVersion,
    advice: {
      headline: readText(value.advice.headline, "headline", 120),
      explanation: readText(value.advice.explanation, "explanation", 700),
      focusPoints: focusPoints.map((item) =>
        readText(item, "focusPoints", 180),
      ),
      warning: warning === null
        ? null
        : readText(warning, "warning", 240),
      question: readText(value.advice.question, "question", 240),
    },
  };
}

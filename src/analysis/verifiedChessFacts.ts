import { Chess, type PieceSymbol, type Square } from "chess.js";
import type { EngineAnalysis } from "../types/chess";
import { explainEngineMove } from "../utils/explainMove";
import { detectTacticalMotifs } from "./tacticalMotifs";

export const verifiedChessFactsVersion = 1 as const;

export type VerifiedFactCategory =
  | "position"
  | "recommendation"
  | "evaluation"
  | "motif"
  | "move-effect";

export type VerifiedChessFact = {
  id: string;
  category: VerifiedFactCategory;
  text: string;
};

export type VerifiedVariation = {
  id: string;
  rank: number;
  moves: string[];
};

export type VerifiedChessFacts = {
  version: typeof verifiedChessFactsVersion;
  position: {
    fen: string;
    sideToMove: "white" | "black";
    fullMoveNumber: number;
    phase: "opening" | "middlegame" | "endgame";
  };
  recommendation: {
    bestMove: string;
    evaluation: number | null;
    mate: number | null;
    depth: number;
  };
  variations: VerifiedVariation[];
  facts: VerifiedChessFact[];
};

const movePattern = /^[a-h][1-8][a-h][1-8][qrbn]?$/;

const pieceValues: Record<PieceSymbol, number> = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
  k: 0,
};

const phaseLabels: Record<VerifiedChessFacts["position"]["phase"], string> = {
  opening: "Дебют",
  middlegame: "Миттельшпиль",
  endgame: "Эндшпиль",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeNumber(value: number | null, limit: number) {
  if (value === null || !Number.isFinite(value)) {
    return null;
  }

  return Math.max(-limit, Math.min(limit, value));
}

function formatMove(move: string) {
  const promotion = move.slice(4);
  const route = `${move.slice(0, 2)} → ${move.slice(2, 4)}`;

  return promotion ? `${route}=${promotion.toUpperCase()}` : route;
}

function getPhase(game: Chess): VerifiedChessFacts["position"]["phase"] {
  const fullMoveNumber = Number(game.fen().split(" ")[5]);

  if (fullMoveNumber <= 10) {
    return "opening";
  }

  let totalMaterial = 0;

  for (const row of game.board()) {
    for (const piece of row) {
      if (piece && piece.type !== "k") {
        totalMaterial += pieceValues[piece.type];
      }
    }
  }

  return totalMaterial <= 22 ? "endgame" : "middlegame";
}

function formatEvaluation(
  evaluation: number | null,
  mate: number | null,
) {
  if (mate !== null) {
    return mate > 0
      ? `Расчёт показывает мат за ${Math.abs(mate)}.`
      : `Стороне хода угрожает мат за ${Math.abs(mate)}.`;
  }

  if (evaluation === null) {
    return "Точная числовая оценка позиции не получена.";
  }

  return `Оценка позиции для стороны хода: ${evaluation.toFixed(2)}.`;
}

function applyMove(game: Chess, move: string) {
  if (!movePattern.test(move)) {
    return false;
  }

  try {
    return Boolean(game.move({
      from: move.slice(0, 2) as Square,
      to: move.slice(2, 4) as Square,
      promotion: move.slice(4) || "q",
    }));
  } catch {
    return false;
  }
}

function normalizeVariation(fen: string, moves: string[]) {
  const game = new Chess(fen);
  const verified: string[] = [];

  for (const move of moves.slice(0, 8)) {
    if (!applyMove(game, move)) {
      break;
    }

    verified.push(move);
  }

  return verified;
}

function buildCanonicalFacts({
  fen,
  sideToMove,
  phase,
  bestMove,
  evaluation,
  mate,
}: {
  fen: string;
  sideToMove: "white" | "black";
  phase: VerifiedChessFacts["position"]["phase"];
  bestMove: string;
  evaluation: number | null;
  mate: number | null;
}) {
  const facts: VerifiedChessFact[] = [
    {
      id: "position.side-to-move",
      category: "position",
      text: sideToMove === "white" ? "Ход белых." : "Ход чёрных.",
    },
    {
      id: "position.phase",
      category: "position",
      text: `Стадия партии: ${phaseLabels[phase]}.`,
    },
    {
      id: "recommendation.best-move",
      category: "recommendation",
      text: `Проверенный лучший ход: ${formatMove(bestMove)}.`,
    },
    {
      id: "recommendation.evaluation",
      category: "evaluation",
      text: formatEvaluation(evaluation, mate),
    },
  ];

  for (const motif of detectTacticalMotifs(fen, bestMove)) {
    facts.push({
      id: `motif.${motif.id}`,
      category: "motif",
      text: motif.description,
    });
  }

  explainEngineMove(fen, bestMove).forEach((text, index) => {
    if (!facts.some((fact) => fact.text === text)) {
      facts.push({
        id: `move-effect.${index + 1}`,
        category: "move-effect",
        text,
      });
    }
  });

  return facts.slice(0, 10);
}

export function createVerifiedChessFacts({
  fen,
  analysis,
}: {
  fen: string;
  analysis: EngineAnalysis;
}): VerifiedChessFacts {
  const game = new Chess(fen);
  const normalizedFen = game.fen();

  if (!movePattern.test(analysis.bestMove)) {
    throw new Error("Не удалось проверить рекомендованный ход");
  }

  const legalMoveCheck = new Chess(normalizedFen);

  if (!applyMove(legalMoveCheck, analysis.bestMove)) {
    throw new Error("Рекомендованный ход не соответствует позиции");
  }

  const evaluation = normalizeNumber(analysis.evaluation, 100);
  const mate = normalizeNumber(analysis.mate, 100);
  const phase = getPhase(game);
  const sideToMove = game.turn() === "w" ? "white" : "black";
  const candidateLines = analysis.lines.length > 0
    ? analysis.lines
    : [{ ...analysis, lines: undefined }];
  const variations = candidateLines
    .slice(0, 3)
    .map((line, index) => ({
      id: `variation.${index + 1}`,
      rank: index + 1,
      moves: normalizeVariation(normalizedFen, line.variation),
    }))
    .filter((line) => line.moves.length > 0);

  return {
    version: verifiedChessFactsVersion,
    position: {
      fen: normalizedFen,
      sideToMove,
      fullMoveNumber: Number(normalizedFen.split(" ")[5]),
      phase,
    },
    recommendation: {
      bestMove: analysis.bestMove,
      evaluation,
      mate,
      depth: Math.max(0, Math.min(100, Math.round(analysis.depth))),
    },
    variations,
    facts: buildCanonicalFacts({
      fen: normalizedFen,
      sideToMove,
      phase,
      bestMove: analysis.bestMove,
      evaluation,
      mate,
    }),
  };
}

export function parseVerifiedChessFacts(value: unknown): VerifiedChessFacts {
  if (
    !isRecord(value) ||
    value.version !== verifiedChessFactsVersion ||
    !isRecord(value.position) ||
    !isRecord(value.recommendation) ||
    !Array.isArray(value.variations) ||
    !Array.isArray(value.facts)
  ) {
    throw new Error("Некорректный пакет шахматных фактов");
  }

  const { position, recommendation } = value;

  if (
    typeof position.fen !== "string" ||
    position.fen.length > 100 ||
    (position.sideToMove !== "white" && position.sideToMove !== "black") ||
    typeof position.fullMoveNumber !== "number" ||
    !Number.isInteger(position.fullMoveNumber) ||
    position.fullMoveNumber < 1 ||
    (position.phase !== "opening" &&
      position.phase !== "middlegame" &&
      position.phase !== "endgame") ||
    typeof recommendation.bestMove !== "string" ||
    !movePattern.test(recommendation.bestMove) ||
    (recommendation.evaluation !== null &&
      (typeof recommendation.evaluation !== "number" ||
        !Number.isFinite(recommendation.evaluation))) ||
    (recommendation.mate !== null &&
      (typeof recommendation.mate !== "number" ||
        !Number.isFinite(recommendation.mate))) ||
    typeof recommendation.depth !== "number" ||
    !Number.isInteger(recommendation.depth) ||
    recommendation.depth < 0 ||
    recommendation.depth > 100 ||
    value.variations.length > 3 ||
    value.facts.length < 4 ||
    value.facts.length > 10
  ) {
    throw new Error("Некорректные поля шахматных фактов");
  }

  let game: Chess;

  try {
    game = new Chess(position.fen);
  } catch {
    throw new Error("Некорректная позиция в шахматных фактах");
  }

  const normalizedFen = game.fen();
  const expectedSide = game.turn() === "w" ? "white" : "black";
  const expectedFullMove = Number(normalizedFen.split(" ")[5]);
  const expectedPhase = getPhase(game);

  if (
    position.fen !== normalizedFen ||
    position.sideToMove !== expectedSide ||
    position.fullMoveNumber !== expectedFullMove ||
    position.phase !== expectedPhase
  ) {
    throw new Error("Шахматные факты не соответствуют позиции");
  }

  const legalMoveCheck = new Chess(normalizedFen);

  if (!applyMove(legalMoveCheck, recommendation.bestMove)) {
    throw new Error("Лучший ход не соответствует позиции");
  }

  const variations = value.variations.map((item, index) => {
    if (
      !isRecord(item) ||
      item.id !== `variation.${index + 1}` ||
      item.rank !== index + 1 ||
      !Array.isArray(item.moves) ||
      item.moves.length < 1 ||
      item.moves.length > 8 ||
      !item.moves.every((move) => typeof move === "string")
    ) {
      throw new Error("Некорректный проверенный вариант");
    }

    const moves = item.moves as string[];

    if (normalizeVariation(normalizedFen, moves).length !== moves.length) {
      throw new Error("Вариант содержит недопустимый ход");
    }

    return { id: item.id, rank: item.rank, moves } as VerifiedVariation;
  });

  const facts = value.facts.map((item) => {
    if (
      !isRecord(item) ||
      typeof item.id !== "string" ||
      typeof item.text !== "string" ||
      !["position", "recommendation", "evaluation", "motif", "move-effect"].includes(
        String(item.category),
      )
    ) {
      throw new Error("Некорректный проверенный факт");
    }

    return item as VerifiedChessFact;
  });
  const expectedFacts = buildCanonicalFacts({
    fen: normalizedFen,
    sideToMove: expectedSide,
    phase: expectedPhase,
    bestMove: recommendation.bestMove,
    evaluation: recommendation.evaluation as number | null,
    mate: recommendation.mate as number | null,
  });

  if (JSON.stringify(facts) !== JSON.stringify(expectedFacts)) {
    throw new Error("Шахматные факты не прошли проверку");
  }

  return {
    version: verifiedChessFactsVersion,
    position: {
      fen: normalizedFen,
      sideToMove: expectedSide,
      fullMoveNumber: expectedFullMove,
      phase: expectedPhase,
    },
    recommendation: {
      bestMove: recommendation.bestMove,
      evaluation: recommendation.evaluation as number | null,
      mate: recommendation.mate as number | null,
      depth: recommendation.depth,
    },
    variations,
    facts,
  };
}

export function getAllowedVerifiedMoves(facts: VerifiedChessFacts) {
  return new Set([
    facts.recommendation.bestMove,
    ...facts.variations.flatMap((variation) => variation.moves),
  ]);
}

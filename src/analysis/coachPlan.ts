import { Chess, type Color, type PieceSymbol, type Square } from "chess.js";
import type { EngineAnalysis } from "../types/chess";
import { explainEngineMove } from "../utils/explainMove";

export type CoachPriority = "attack" | "safety" | "development" | "material" | "position";

export type CoachPlan = {
  phase: string;
  priority: CoachPriority;
  headline: string;
  mainMove: string;
  evaluationText: string;
  firstSteps: string[];
  watchOut: string[];
  expectedLine: string;
};

const pieceValues: Record<PieceSymbol, number> = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
  k: 0,
};

const pieceNames: Record<PieceSymbol, string> = {
  p: "пешку",
  n: "коня",
  b: "слона",
  r: "ладью",
  q: "ферзя",
  k: "короля",
};

const centerSquares = new Set(["d4", "e4", "d5", "e5"]);
const extendedCenterSquares = new Set([
  "c3",
  "d3",
  "e3",
  "f3",
  "c4",
  "d4",
  "e4",
  "f4",
  "c5",
  "d5",
  "e5",
  "f5",
  "c6",
  "d6",
  "e6",
  "f6",
]);

function getFullMoveNumber(fen: string) {
  const value = Number(fen.split(" ")[5]);

  return Number.isFinite(value) ? value : 1;
}

function getPhase(fen: string) {
  const fullMove = getFullMoveNumber(fen);

  if (fullMove <= 10) {
    return "Дебют";
  }

  const game = new Chess(fen);
  const board = game.board();
  let totalMaterial = 0;

  for (const row of board) {
    for (const piece of row) {
      if (piece && piece.type !== "k") {
        totalMaterial += pieceValues[piece.type];
      }
    }
  }

  if (totalMaterial <= 22) {
    return "Эндшпиль";
  }

  return "Миттельшпиль";
}

function formatMove(move: string) {
  if (!move || move === "(none)") {
    return "ход не найден";
  }

  const from = move.slice(0, 2);
  const to = move.slice(2, 4);
  const promotion = move.slice(4);

  if (promotion) {
    return `${from} → ${to}, превращение в ${promotion.toUpperCase()}`;
  }

  return `${from} → ${to}`;
}

function formatVariation(variation: string[]) {
  if (variation.length === 0) {
    return "Вариант пока не рассчитан.";
  }

  return variation.slice(0, 6).map(formatMove).join(" • ");
}

function formatEvaluation(analysis: EngineAnalysis) {
  if (analysis.mate !== null) {
    return analysis.mate > 0
      ? `мат за ${Math.abs(analysis.mate)}`
      : `угроза мата за ${Math.abs(analysis.mate)}`;
  }

  if (analysis.evaluation === null) {
    return "оценка пока без точного числа";
  }

  const abs = Math.abs(analysis.evaluation);

  if (abs < 0.3) {
    return "примерно равная позиция";
  }

  if (abs < 1) {
    return analysis.evaluation > 0
      ? "небольшое преимущество стороны хода"
      : "позиция чуть хуже для стороны хода";
  }

  if (abs < 2) {
    return analysis.evaluation > 0
      ? "заметное преимущество стороны хода"
      : "стороне хода нужно играть точно";
  }

  return analysis.evaluation > 0
    ? "большой перевес стороны хода"
    : "позиция опасная, нужен точный защитный ход";
}

function getMoveFacts(fen: string, move: string) {
  const game = new Chess(fen);
  const from = move.slice(0, 2) as Square;
  const to = move.slice(2, 4) as Square;
  const promotion = move.slice(4);
  const movingPiece = game.get(from);
  const targetPiece = game.get(to);

  if (!movingPiece) {
    return null;
  }

  try {
    const result = game.move({
      from,
      to,
      promotion: promotion || "q",
    });

    if (!result) {
      return null;
    }

    const isCastle =
      movingPiece.type === "k" &&
      Math.abs(from.charCodeAt(0) - to.charCodeAt(0)) === 2;

    const capturedPiece = result.captured ?? targetPiece?.type ?? null;
    const isCheckmate = game.isCheckmate();
    const isCheck = !isCheckmate && game.inCheck();

    return {
      from,
      to,
      movingPiece,
      capturedPiece,
      isCastle,
      isCheck,
      isCheckmate,
      isCenter: centerSquares.has(to),
      isExtendedCenter: extendedCenterSquares.has(to),
      isPromotion: Boolean(promotion || result.promotion),
    };
  } catch {
    return null;
  }
}

function getPriority({
  phase,
  facts,
  analysis,
}: {
  phase: string;
  facts: ReturnType<typeof getMoveFacts>;
  analysis: EngineAnalysis;
}): CoachPriority {
  if (facts?.isCheckmate || facts?.isCheck) {
    return "attack";
  }

  if (analysis.evaluation !== null && analysis.evaluation < -1) {
    return "safety";
  }

  if (facts?.capturedPiece) {
    return "material";
  }

  if (phase === "Дебют") {
    return "development";
  }

  return "position";
}

function getHeadline(priority: CoachPriority) {
  if (priority === "attack") {
    return "Главное сейчас — создать прямую угрозу королю.";
  }

  if (priority === "safety") {
    return "Главное сейчас — не развалить позицию и найти точную защиту.";
  }

  if (priority === "material") {
    return "Главное сейчас — забрать материал без ухудшения позиции.";
  }

  if (priority === "development") {
    return "Главное сейчас — развить фигуры и укрепить центр.";
  }

  return "Главное сейчас — улучшить расположение фигур.";
}

function getWatchOut({
  phase,
  sideToMove,
  priority,
}: {
  phase: string;
  sideToMove: Color;
  priority: CoachPriority;
}) {
  const side = sideToMove === "w" ? "белых" : "чёрных";
  const warnings: string[] = [];

  if (phase === "Дебют") {
    warnings.push("Не делай много ходов одной и той же фигурой без причины.");
    warnings.push("Не выводи ферзя рано, если нет конкретной тактики.");
  }

  if (priority === "safety") {
    warnings.push(`У ${side} позиция требует аккуратности: сначала проверь шахи, взятия и угрозы соперника.`);
  }

  warnings.push("Не воспринимай совет как план на всю партию: после ответа соперника позицию нужно оценивать заново.");

  return warnings.slice(0, 3);
}

export function buildCoachPlan(
  analysis: EngineAnalysis,
  fen: string,
): CoachPlan {
  const phase = getPhase(fen);
  const sideToMove = fen.split(" ")[1] === "b" ? "b" : "w";
  const facts = getMoveFacts(fen, analysis.bestMove);
  const priority = getPriority({ phase, facts, analysis });
  const explanations = explainEngineMove(fen, analysis.bestMove);
  const firstSteps: string[] = [];

  firstSteps.push(`Сыграй ${formatMove(analysis.bestMove)}.`);

  if (facts?.capturedPiece) {
    firstSteps.push(`Этот ход забирает ${pieceNames[facts.capturedPiece]} соперника.`);
  }

  if (facts?.isCastle) {
    firstSteps.push("После рокировки король становится безопаснее, а ладья ближе к игре.");
  }

  if (facts?.isCenter || facts?.isExtendedCenter) {
    firstSteps.push("Ход улучшает контроль центральных полей.");
  }

  for (const item of explanations) {
    if (!firstSteps.includes(item)) {
      firstSteps.push(item);
    }
  }

  return {
    phase,
    priority,
    headline: getHeadline(priority),
    mainMove: formatMove(analysis.bestMove),
    evaluationText: formatEvaluation(analysis),
    firstSteps: firstSteps.slice(0, 4),
    watchOut: getWatchOut({ phase, sideToMove, priority }),
    expectedLine: analysis.variation.length >= 2
      ? formatVariation(analysis.variation.slice(1, 6))
      : "После хода соперника снова нажми анализ и оцени новую позицию.",
  };
}

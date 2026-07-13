import type { Color } from "chess.js";
import type { EngineAnalysis } from "../types/chess";
import type { MoveReviewVerdict } from "./reviewTypes";

export function getTurnFromFen(fen: string): Color {
  return fen.split(" ")[1] === "b" ? "b" : "w";
}

export function getWhiteEvaluation(
  analysis: EngineAnalysis,
  turn: Color,
) {
  if (analysis.mate !== null) {
    const mateForWhite = turn === "w" ? analysis.mate : -analysis.mate;

    return mateForWhite > 0 ? 99 : -99;
  }

  if (analysis.evaluation === null) {
    return 0;
  }

  return turn === "w" ? analysis.evaluation : -analysis.evaluation;
}

export function getFullMoveNumber(fen: string) {
  const value = Number(fen.split(" ")[5]);

  return Number.isFinite(value) ? value : 1;
}

export function shouldAddToLearningJournal(verdict: MoveReviewVerdict) {
  return verdict === "inaccuracy" || verdict === "mistake" || verdict === "blunder";
}

export function getVerdict({
  matchedBestMove,
  evaluationLoss,
}: {
  matchedBestMove: boolean | null;
  evaluationLoss: number | null;
}): MoveReviewVerdict {
  if (matchedBestMove) {
    return "best";
  }

  if (evaluationLoss === null) {
    return "unknown";
  }

  if (evaluationLoss <= 0.2) {
    return "good";
  }

  if (evaluationLoss <= 0.6) {
    return "inaccuracy";
  }

  if (evaluationLoss <= 1.5) {
    return "mistake";
  }

  return "blunder";
}

export function isMoveMatchingBestMove({
  playedMove,
  bestMove,
}: {
  playedMove: string;
  bestMove: string | null;
}) {
  return Boolean(bestMove && bestMove.startsWith(playedMove));
}

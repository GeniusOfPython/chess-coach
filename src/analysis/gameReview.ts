import type { Color } from "chess.js";
import type { MoveReviewVerdict } from "./reviewTypes";

export type GameReviewStatus =
  | "idle"
  | "running"
  | "paused"
  | "done"
  | "error";

export type GameReviewItem = {
  id: string;
  positionFen: string;
  positionIndex: number;
  moveNumber: number;
  side: Color;
  playedMove: string;
  bestMove: string | null;
  verdict: MoveReviewVerdict;
  evaluationBeforeWhite: number;
  evaluationAfterWhite: number | null;
  evaluationLoss: number | null;
  isPlayerDecision: boolean;
};

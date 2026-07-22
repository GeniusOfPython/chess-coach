import type { Color } from "chess.js";
import type { GameReviewItem } from "./gameReview";

export const reviewCheckpointVersion = 1 as const;

export type ReviewCheckpoint = {
  version: typeof reviewCheckpointVersion;
  signature: string;
  total: number;
  nextIndex: number;
  items: GameReviewItem[];
  updatedAt: number;
};

type ReviewMove = { from: string; to: string };

function hashText(value: string) {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(36);
}

export function createReviewSignature({
  fenHistory,
  moveHistory,
  reviewSide,
}: {
  fenHistory: string[];
  moveHistory: ReviewMove[];
  reviewSide?: Color;
}) {
  const moves = moveHistory.map(({ from, to }) => `${from}${to}`).join(",");
  return hashText(`${reviewSide ?? "all"}|${fenHistory.join("|")}|${moves}`);
}

import { useState } from "react";
import type { MoveReview } from "../components/MoveReviewPanel";

export function useGameSession() {
  const [isBotThinking, setIsBotThinking] = useState(false);
  const [isBotGameStarted, setIsBotGameStarted] = useState(false);
  const [lastMoveReview, setLastMoveReview] = useState<MoveReview | null>(null);
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);

  function resetSession() {
    setIsBotThinking(false);
    setIsBotGameStarted(false);
    setLastMoveReview(null);
    setSelectedSquare(null);
  }

  return {
    isBotThinking,
    setIsBotThinking,
    isBotGameStarted,
    setIsBotGameStarted,
    lastMoveReview,
    setLastMoveReview,
    selectedSquare,
    setSelectedSquare,
    resetSession,
  };
}

import { useState } from "react";
import type { MoveReview } from "../components/MoveReviewPanel";

export function useGameSession() {
  const [isBotThinking, setIsBotThinking] = useState(false);
  const [isBotGameStarted, setIsBotGameStarted] = useState(false);
  const [botSessionId, setBotSessionId] = useState(0);
  const [lastMoveReview, setLastMoveReview] = useState<MoveReview | null>(null);
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);

  function resetSession() {
    setIsBotThinking(false);
    setIsBotGameStarted(false);
    setLastMoveReview(null);
    setSelectedSquare(null);
  }

  function startBotSession() {
    setIsBotThinking(false);
    setIsBotGameStarted(true);
    setBotSessionId((currentId) => currentId + 1);
  }

  return {
    isBotThinking,
    setIsBotThinking,
    isBotGameStarted,
    setIsBotGameStarted,
    botSessionId,
    startBotSession,
    lastMoveReview,
    setLastMoveReview,
    selectedSquare,
    setSelectedSquare,
    resetSession,
  };
}


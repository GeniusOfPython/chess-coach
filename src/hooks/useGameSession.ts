import { useEffect, useState } from "react";
import type { MoveReview } from "../components/MoveReviewPanel";
import type { Color } from "chess.js";
import type { BotGameTermination } from "../game/gameTypes";
import { gameSessionRepository } from "../repositories/gameSessionRepository";

export function useGameSession() {
  const [isBotThinking, setIsBotThinking] = useState(false);
  const [isBotGameStarted, setIsBotGameStarted] = useState(
    gameSessionRepository.loadBotGameStarted,
  );
  const [botSessionId, setBotSessionId] = useState(0);
  const [lastMoveReview, setLastMoveReview] = useState<MoveReview | null>(null);
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [gameTermination, setGameTermination] =
    useState<BotGameTermination | null>(gameSessionRepository.loadTermination);

  useEffect(() => {
    gameSessionRepository.saveBotGameStarted(isBotGameStarted);
  }, [isBotGameStarted]);

  useEffect(() => {
    gameSessionRepository.saveTermination(gameTermination);
  }, [gameTermination]);

  function resetSession() {
    setIsBotThinking(false);
    setIsBotGameStarted(false);
    setLastMoveReview(null);
    setSelectedSquare(null);
    setGameTermination(null);
  }

  function startBotSession() {
    setIsBotThinking(false);
    setIsBotGameStarted(true);
    setBotSessionId((currentId) => currentId + 1);
    setGameTermination(null);
  }

  function terminateBotGame(playerSide: Color) {
    const winner = playerSide === "w" ? "black" : "white";

    setIsBotThinking(false);
    setBotSessionId((currentId) => currentId + 1);
    setGameTermination({
      reason: "resignation",
      winner,
      result: winner === "white" ? "1-0" : "0-1",
    });
  }

  function clearGameTermination() {
    setGameTermination(null);
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
    gameTermination,
    terminateBotGame,
    clearGameTermination,
  };
}

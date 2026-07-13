import { useEffect, useRef } from "react";
import { getBotLevel, type BotLevelId } from "../types/bot";

type CalculateBotMove = (options: {
  fen: string;
  isGameOver: boolean;
  botLevel: { movetime: number };
}) => Promise<string | null>;

type UseBotTurnOptions = {
  enabled: boolean;
  fen: string;
  isGameOver: boolean;
  botLevelId: BotLevelId;
  sessionId: number;
  calculateBotMove: CalculateBotMove;
  makeEngineMove: (move: string) => boolean;
  setIsThinking: (isThinking: boolean) => void;
};

const botReactionDelayMs = 500;

export function useBotTurn({
  enabled,
  fen,
  isGameOver,
  botLevelId,
  sessionId,
  calculateBotMove,
  makeEngineMove,
  setIsThinking,
}: UseBotTurnOptions) {
  const calculateBotMoveRef = useRef(calculateBotMove);
  const makeEngineMoveRef = useRef(makeEngineMove);
  const activeRequestRef = useRef<string | null>(null);

  useEffect(() => {
    calculateBotMoveRef.current = calculateBotMove;
    makeEngineMoveRef.current = makeEngineMove;
  }, [calculateBotMove, makeEngineMove]);

  useEffect(() => {
    if (!enabled || isGameOver) {
      activeRequestRef.current = null;
      setIsThinking(false);
      return;
    }

    const requestKey = `${sessionId}:${botLevelId}:${fen}`;

    if (activeRequestRef.current === requestKey) {
      return;
    }

    activeRequestRef.current = requestKey;
    setIsThinking(true);

    let cancelled = false;
    const reactionTimer = window.setTimeout(() => {
      const botLevel = getBotLevel(botLevelId);

      void calculateBotMoveRef.current({
        fen,
        isGameOver,
        botLevel,
      })
        .then((bestMove) => {
          if (cancelled || !bestMove) {
            return;
          }

          makeEngineMoveRef.current(bestMove);
        })
        .catch((error) => {
          console.error("Ошибка автоматического хода бота:", error);
        })
        .finally(() => {
          if (!cancelled && activeRequestRef.current === requestKey) {
            setIsThinking(false);
          }
        });
    }, botReactionDelayMs);

    return () => {
      cancelled = true;
      window.clearTimeout(reactionTimer);

      if (activeRequestRef.current === requestKey) {
        activeRequestRef.current = null;
        setIsThinking(false);
      }
    };
  }, [
    botLevelId,
    enabled,
    fen,
    isGameOver,
    sessionId,
    setIsThinking,
  ]);
}

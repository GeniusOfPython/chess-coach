import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
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
  const [error, setError] = useState<string | null>(null);
  const [retryId, setRetryId] = useState(0);
  const calculateBotMoveRef = useRef(calculateBotMove);
  const makeEngineMoveRef = useRef(makeEngineMove);
  const activeRequestRef = useRef<string | null>(null);

  useEffect(() => {
    calculateBotMoveRef.current = calculateBotMove;
    makeEngineMoveRef.current = makeEngineMove;
  }, [calculateBotMove, makeEngineMove]);

  const retry = useCallback(() => {
    activeRequestRef.current = null;
    setError(null);
    setRetryId((currentId) => currentId + 1);
  }, []);

  useEffect(() => {
    if (!enabled || isGameOver) {
      activeRequestRef.current = null;
      setError(null);
      setIsThinking(false);
      return;
    }

    const requestKey = `${sessionId}:${botLevelId}:${fen}`;

    if (activeRequestRef.current === requestKey) {
      return;
    }

    activeRequestRef.current = requestKey;
    setError(null);
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
          if (cancelled) {
            return;
          }

          if (!bestMove) {
            setError("Stockfish не смог рассчитать ход.");
            return;
          }

          if (!makeEngineMoveRef.current(bestMove)) {
            setError("Не удалось применить рассчитанный ход.");
          }
        })
        .catch((error) => {
          console.error("Ошибка автоматического хода бота:", error);

          if (!cancelled) {
            setError("Stockfish временно недоступен.");
          }
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
    retryId,
    sessionId,
    setIsThinking,
  ]);

  return {
    error,
    retry,
  };
}

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Color } from "chess.js";
import { StockfishService } from "../engine/StockfishService";
import type { EngineAnalysis } from "../types/chess";

export function useEngineAnalysis() {
  const analysisEngine = useMemo(
    () => new StockfishService(),
    [],
  );

  const botEngine = useMemo(
    () => new StockfishService(),
    [],
  );

  const reviewEngine = useMemo(
    () => new StockfishService(),
    [],
  );

  const [analysis, setAnalysis] =
    useState<EngineAnalysis | null>(null);

  const [analyzedTurn, setAnalyzedTurn] =
    useState<Color>("w");

  const [isAnalyzing, setIsAnalyzing] =
    useState(false);

  const [error, setError] = useState("");

  useEffect(() => {
    return () => {
      analysisEngine.destroy();
      botEngine.destroy();
      reviewEngine.destroy();
    };
  }, [analysisEngine, botEngine, reviewEngine]);

  const clearAnalysis = useCallback(() => {
    analysisEngine.stop();
    setAnalysis(null);
    setError("");
    setIsAnalyzing(false);
  }, [analysisEngine]);

  const analyzePosition = useCallback(
    async ({
      fen,
      turn,
      isGameOver,
    }: {
      fen: string;
      turn: Color;
      isGameOver: boolean;
    }) => {
      if (isGameOver) {
        setError("Партия уже завершена");
        return;
      }

      setIsAnalyzing(true);
      setAnalysis(null);
      setError("");

      try {
        const result = await analysisEngine.analyze(fen, {
          movetime: 1500,
          multiPv: 3,
        });

        setAnalyzedTurn(turn);
        setAnalysis(result);
      } catch (analysisError) {
        setError(
          analysisError instanceof Error
            ? analysisError.message
            : "Ошибка анализа",
        );
      } finally {
        setIsAnalyzing(false);
      }
    },
    [analysisEngine],
  );

  const calculateBestMove = useCallback(
    async ({
      fen,
      isGameOver,
      movetime = 1000,
    }: {
      fen: string;
      isGameOver: boolean;
      movetime?: number;
    }) => {
      if (isGameOver) {
        return null;
      }

      try {
        const result = await botEngine.analyze(fen, {
          movetime,
          multiPv: 1,
        });

        if (
          !result.bestMove ||
          result.bestMove === "(none)"
        ) {
          return null;
        }

        return result.bestMove;
      } catch (error) {
        console.error("Ошибка расчёта хода бота:", error);
        return null;
      }
    },
    [botEngine],
  );

  const calculateBotMove = useCallback(
    async ({
      fen,
      isGameOver,
      botLevel,
    }: {
      fen: string;
      isGameOver: boolean;
      botLevel: { movetime: number };
    }) => calculateBestMove({
      fen,
      isGameOver,
      movetime: botLevel.movetime,
    }),
    [calculateBestMove],
  );

  const calculatePositionAnalysis = useCallback(
    async ({
      fen,
      isGameOver,
      movetime = 900,
    }: {
      fen: string;
      isGameOver: boolean;
      movetime?: number;
    }) => {
      if (isGameOver) return null;

      try {
        return await reviewEngine.analyze(fen, {
          movetime,
          multiPv: 1,
        });
      } catch (error) {
        console.error("Ошибка оценки позиции после хода:", error);
        return null;
      }
    },
    [reviewEngine],
  );

  return {
    analysis,
    analyzedTurn,
    isAnalyzing,
    error,
    analyzePosition,
    calculateBestMove,
    calculateBotMove,
    calculatePositionAnalysis,
    clearAnalysis,
  };
}

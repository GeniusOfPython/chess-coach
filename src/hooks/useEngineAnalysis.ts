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
  const engine = useMemo(
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
      engine.destroy();
    };
  }, [engine]);

  const clearAnalysis = useCallback(() => {
    engine.stop();
    setAnalysis(null);
    setError("");
    setIsAnalyzing(false);
  }, [engine]);

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
        const result = await engine.analyze(fen);

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
    [engine],
  );

  const calculateBestMove = useCallback(
  async ({
    fen,
    isGameOver,
  }: {
    fen: string;
    isGameOver: boolean;
  }) => {
    if (isGameOver) {
      return null;
    }

    try {
      const result = await engine.analyze(fen);

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
  [engine],
);
  return {
    analysis,
    analyzedTurn,
    isAnalyzing,
    error,
    analyzePosition,
    calculateBestMove,
    clearAnalysis,
  };
}
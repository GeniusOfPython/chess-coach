import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Chess } from "chess.js";
import type { Color, Square } from "chess.js";
import { StockfishService } from "../engine/StockfishService";
import type { EngineAnalysis } from "../types/chess";
import type { BotLevel } from "../types/bot";

function toUciMove(move: {
  from: string;
  to: string;
  promotion?: string;
}) {
  return `${move.from}${move.to}${move.promotion ?? ""}`;
}

function getRandomLegalMove(fen: string) {
  const game = new Chess(fen);
  const moves = game.moves({ verbose: true });

  if (moves.length === 0) {
    return null;
  }

  const move = moves[Math.floor(Math.random() * moves.length)];

  return toUciMove({
    from: move.from,
    to: move.to,
    promotion: move.promotion,
  });
}

function isLegalMove(fen: string, uciMove: string) {
  const game = new Chess(fen);
  const from = uciMove.slice(0, 2) as Square;
  const to = uciMove.slice(2, 4) as Square;
  const promotion = uciMove.slice(4) || "q";

  try {
    return Boolean(game.move({ from, to, promotion }));
  } catch {
    return false;
  }
}

function chooseBotMoveFromAnalysis({
  fen,
  analysis,
  botLevel,
}: {
  fen: string;
  analysis: EngineAnalysis;
  botLevel: BotLevel;
}) {
  const randomValue = Math.random();

  if (randomValue < botLevel.randomLegalMoveChance) {
    const randomMove = getRandomLegalMove(fen);

    if (randomMove) {
      return randomMove;
    }
  }

  const legalLines = analysis.lines.filter((line) =>
    isLegalMove(fen, line.bestMove),
  );

  if (legalLines.length === 0) {
    return analysis.bestMove;
  }

  const secondThreshold =
    botLevel.randomLegalMoveChance +
    botLevel.secondLineChance;

  const thirdThreshold =
    secondThreshold + botLevel.thirdLineChance;

  if (randomValue < secondThreshold && legalLines[1]) {
    return legalLines[1].bestMove;
  }

  if (randomValue < thirdThreshold && legalLines[2]) {
    return legalLines[2].bestMove;
  }

  return legalLines[0].bestMove;
}

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
          movetime: 1800,
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

  const calculateBotMove = useCallback(
    async ({
      fen,
      isGameOver,
      botLevel,
    }: {
      fen: string;
      isGameOver: boolean;
      botLevel: BotLevel;
    }) => {
      if (isGameOver) {
        return null;
      }

      try {
        const result = await botEngine.analyze(fen, {
          movetime: botLevel.movetime,
          multiPv: botLevel.multiPv,
          timeoutMs: botLevel.movetime + 2500,
        });

        const move = chooseBotMoveFromAnalysis({
          fen,
          analysis: result,
          botLevel,
        });

        if (!move || move === "(none)") {
          return getRandomLegalMove(fen);
        }

        return move;
      } catch (error) {
        console.error("Ошибка расчёта хода бота:", error);
        return getRandomLegalMove(fen);
      }
    },
    [botEngine],
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
      if (isGameOver) {
        return null;
      }

      try {
        return await reviewEngine.analyze(fen, {
          movetime,
          multiPv: 1,
        });
      } catch (error) {
        console.error(
          "Ошибка оценки позиции после хода:",
          error,
        );
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
    calculateBotMove,
    calculatePositionAnalysis,
    clearAnalysis,
  };
}

import { useEffect, useRef, useState } from "react";
import type { Color } from "chess.js";
import type {
  GameReviewItem,
  GameReviewStatus,
} from "../analysis/gameReview";
import {
  cacheReviewAnalysis,
  clearReviewCheckpoint,
  createReviewSignature,
  getCachedReviewAnalysis,
  readReviewCheckpoint,
  saveReviewCheckpoint,
} from "../analysis/reviewSession";
import {
  getFullMoveNumber,
  getTurnFromFen,
  getVerdict,
  getWhiteEvaluation,
  isMoveMatchingBestMove,
} from "../analysis/reviewRules";
import type { EngineAnalysis } from "../types/chess";

type ReviewMove = { from: string; to: string };

type AnalyzePosition = (options: {
  fen: string;
  isGameOver: boolean;
  movetime?: number;
  timeoutMs?: number;
  signal?: AbortSignal;
}) => Promise<EngineAnalysis | null>;

type RunReviewOptions = {
  fenHistory: string[];
  moveHistory: ReviewMove[];
  calculatePositionAnalysis: AnalyzePosition;
  reviewSide?: Color;
};

function throwIfAborted(signal: AbortSignal) {
  if (signal.aborted) {
    throw new DOMException("Обзор остановлен", "AbortError");
  }
}

export function useGameReview() {
  const [status, setStatus] = useState<GameReviewStatus>("idle");
  const [items, setItems] = useState<GameReviewItem[]>([]);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [restoredProgress, setRestoredProgress] = useState(false);
  const [cachedPositions, setCachedPositions] = useState(0);
  const activeControllerRef = useRef<AbortController | null>(null);

  useEffect(() => () => activeControllerRef.current?.abort(), []);

  function pause() {
    activeControllerRef.current?.abort();
  }

  function reset() {
    activeControllerRef.current?.abort();
    activeControllerRef.current = null;
    clearReviewCheckpoint();
    setStatus("idle");
    setItems([]);
    setProgress(0);
    setError("");
    setRestoredProgress(false);
    setCachedPositions(0);
  }

  async function run({
    fenHistory,
    moveHistory,
    calculatePositionAnalysis,
    reviewSide,
  }: RunReviewOptions) {
    if (status === "running") return;

    const total = Math.min(
      moveHistory.length,
      Math.max(0, fenHistory.length - 1),
      24,
    );
    if (total === 0) return;

    const signature = createReviewSignature({
      fenHistory: fenHistory.slice(0, total + 1),
      moveHistory: moveHistory.slice(0, total),
      reviewSide,
    });
    const checkpoint = readReviewCheckpoint({ signature, total });
    const controller = new AbortController();
    const reviewed = checkpoint ? [...checkpoint.items] : [];
    const startIndex = checkpoint?.nextIndex ?? 0;
    let cacheHits = 0;

    activeControllerRef.current?.abort();
    activeControllerRef.current = controller;
    setStatus("running");
    setItems(reviewed);
    setProgress(startIndex);
    setError("");
    setRestoredProgress(startIndex > 0);
    setCachedPositions(0);

    const analyzeFen = async (fen: string, movetime: number) => {
      throwIfAborted(controller.signal);

      const cached = getCachedReviewAnalysis({ fen, movetime });

      if (cached) {
        cacheHits += 1;
        setCachedPositions(cacheHits);
        return cached;
      }

      const result = await calculatePositionAnalysis({
        fen,
        isGameOver: false,
        movetime,
        timeoutMs: movetime + 1800,
        signal: controller.signal,
      });
      throwIfAborted(controller.signal);

      if (result) {
        cacheReviewAnalysis({ fen, movetime, analysis: result });
      }

      return result;
    };

    try {
      for (let index = startIndex; index < total; index += 1) {
        const beforeFen = fenHistory[index];
        const afterFen = fenHistory[index + 1];
        const move = moveHistory[index];

        if (!beforeFen || !afterFen || !move) {
          setProgress(index + 1);
          saveReviewCheckpoint({
            signature,
            total,
            nextIndex: index + 1,
            items: reviewed,
          });
          continue;
        }

        const side = getTurnFromFen(beforeFen);
        const playedMove = `${move.from}${move.to}`;
        const before = await analyzeFen(beforeFen, 650);

        if (before?.bestMove) {
          const after = await analyzeFen(afterFen, 450);
          const matchedBestMove = isMoveMatchingBestMove({
            playedMove,
            bestMove: before.bestMove,
          });
          const beforeScore = getWhiteEvaluation(before, side);
          const afterScore = after
            ? getWhiteEvaluation(after, getTurnFromFen(afterFen))
            : null;
          const loss = afterScore === null
            ? null
            : Math.max(
                0,
                side === "w"
                  ? beforeScore - afterScore
                  : afterScore - beforeScore,
              );

          reviewed.push({
            id: `${index}-${beforeFen}-${playedMove}`,
            positionFen: beforeFen,
            positionIndex: index,
            moveNumber: getFullMoveNumber(beforeFen),
            side,
            playedMove,
            bestMove: before.bestMove,
            verdict: getVerdict({
              matchedBestMove,
              evaluationLoss: matchedBestMove ? 0 : loss,
            }),
            evaluationBeforeWhite: beforeScore,
            evaluationAfterWhite: afterScore,
            evaluationLoss: matchedBestMove ? 0 : loss,
            isPlayerDecision: !reviewSide || side === reviewSide,
          });
        }

        setItems([...reviewed]);
        setProgress(index + 1);
        saveReviewCheckpoint({
          signature,
          total,
          nextIndex: index + 1,
          items: reviewed,
        });
      }

      clearReviewCheckpoint();
      setStatus("done");
      setRestoredProgress(false);
    } catch (reviewError) {
      if (controller.signal.aborted) {
        if (activeControllerRef.current === controller) {
          setStatus("paused");
        }
        return;
      }

      setStatus("error");
      setError(
        reviewError instanceof Error
          ? reviewError.message
          : "Не удалось разобрать партию.",
      );
    } finally {
      if (activeControllerRef.current === controller) {
        activeControllerRef.current = null;
      }
    }
  }

  return {
    status,
    items,
    progress,
    error,
    restoredProgress,
    cachedPositions,
    run,
    pause,
    reset,
  };
}

import { useRef, useState } from "react";
import type { Color } from "chess.js";
import type {
  GameReviewItem,
  GameReviewStatus,
} from "../analysis/gameReview";
import {
  getFullMoveNumber,
  getTurnFromFen,
  getVerdict,
  getWhiteEvaluation,
  isMoveMatchingBestMove,
} from "../analysis/reviewRules";
import { createReviewSignature } from "../analysis/reviewSession";
import { reviewSessionRepository } from "../repositories/reviewSessionRepository";
import type { EngineAnalysis } from "../types/chess";

type ReviewMove = { from: string; to: string };
type AnalyzePosition = (options: {
  fen: string;
  isGameOver: boolean;
  movetime?: number;
  timeoutMs?: number;
  signal?: AbortSignal;
}) => Promise<EngineAnalysis | null>;

export type GameReviewRunResult = {
  reviewedPositions: number;
  cachedPositions: number;
  restoredProgress: boolean;
};

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}

export function useGameReview() {
  const [status, setStatus] = useState<GameReviewStatus>("idle");
  const [items, setItems] = useState<GameReviewItem[]>([]);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [restoredProgress, setRestoredProgress] = useState(false);
  const [cachedPositions, setCachedPositions] = useState(0);
  const statusRef = useRef<GameReviewStatus>("idle");
  const itemsRef = useRef<GameReviewItem[]>([]);
  const progressRef = useRef(0);
  const cacheRef = useRef(new Map<string, EngineAnalysis | null>());
  const abortControllerRef = useRef<AbortController | null>(null);

  const updateStatus = (nextStatus: GameReviewStatus) => {
    statusRef.current = nextStatus;
    setStatus(nextStatus);
  };

  const updateProgress = (nextProgress: number) => {
    progressRef.current = nextProgress;
    setProgress(nextProgress);
  };

  const updateItems = (nextItems: GameReviewItem[]) => {
    itemsRef.current = nextItems;
    setItems(nextItems);
  };

  function reset() {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    cacheRef.current.clear();
    updateStatus("idle");
    updateItems([]);
    updateProgress(0);
    setError("");
    setRestoredProgress(false);
    setCachedPositions(0);
    reviewSessionRepository.clearCheckpoint();
  }

  function pause() {
    if (statusRef.current !== "running") {
      return;
    }

    updateStatus("paused");
    abortControllerRef.current?.abort();
  }

  async function run({
    fenHistory,
    moveHistory,
    calculatePositionAnalysis,
    reviewSide,
  }: {
    fenHistory: string[];
    moveHistory: ReviewMove[];
    calculatePositionAnalysis: AnalyzePosition;
    reviewSide?: Color;
  }): Promise<GameReviewRunResult | null> {
    if (statusRef.current === "running") {
      return null;
    }

    const total = Math.min(
      moveHistory.length,
      Math.max(0, fenHistory.length - 1),
      24,
    );

    if (total === 0) {
      return null;
    }

    const isResume = statusRef.current === "paused" && progressRef.current < total;
    const signature = createReviewSignature({
      fenHistory,
      moveHistory,
      reviewSide,
    });
    const checkpoint = isResume
      ? null
      : reviewSessionRepository.readCheckpoint({ signature, total });
    const restoredFromStorage = Boolean(checkpoint);
    const startIndex = isResume
      ? progressRef.current
      : checkpoint?.nextIndex ?? 0;
    const reviewed = isResume
      ? [...itemsRef.current]
      : [...(checkpoint?.items ?? [])];
    let cacheHits = 0;
    const controller = new AbortController();
    abortControllerRef.current = controller;

    if (!isResume) {
      cacheRef.current.clear();
      updateItems(reviewed);
      updateProgress(startIndex);
    }

    updateStatus("running");
    setError("");
    setRestoredProgress(isResume || restoredFromStorage);
    setCachedPositions(0);

    const analyzeFen = async (fen: string, movetime: number) => {
      const cacheKey = `${fen}|${movetime}`;

      if (cacheRef.current.has(cacheKey)) {
        cacheHits += 1;
        setCachedPositions(cacheHits);
        return cacheRef.current.get(cacheKey) ?? null;
      }

      const storedResult = reviewSessionRepository.getCachedAnalysis({
        fen,
        movetime,
      });

      if (storedResult) {
        cacheRef.current.set(cacheKey, storedResult);
        cacheHits += 1;
        setCachedPositions(cacheHits);
        return storedResult;
      }

      const result = await calculatePositionAnalysis({
        fen,
        isGameOver: false,
        movetime,
        timeoutMs: movetime + 3500,
        signal: controller.signal,
      });
      cacheRef.current.set(cacheKey, result);

      if (result) {
        reviewSessionRepository.cacheAnalysis({
          fen,
          movetime,
          analysis: result,
        });
      }

      return result;
    };

    const saveProgress = (nextIndex: number) => {
      reviewSessionRepository.saveCheckpoint({
        signature,
        total,
        nextIndex,
        items: [...reviewed],
      });
    };

    try {
      for (let index = startIndex; index < total; index += 1) {
        if (controller.signal.aborted) {
          throw new DOMException("Review paused", "AbortError");
        }

        const beforeFen = fenHistory[index];
        const afterFen = fenHistory[index + 1];
        const move = moveHistory[index];

        if (!beforeFen || !afterFen || !move) {
          updateProgress(index + 1);
          saveProgress(index + 1);
          continue;
        }

        const side = getTurnFromFen(beforeFen);
        const playedMove = `${move.from}${move.to}`;
        const before = await analyzeFen(beforeFen, 650);

        if (!before?.bestMove) {
          updateProgress(index + 1);
          saveProgress(index + 1);
          continue;
        }

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
        updateItems([...reviewed]);
        updateProgress(index + 1);
        saveProgress(index + 1);
      }

      updateStatus("done");
      reviewSessionRepository.clearCheckpoint();
      return {
        reviewedPositions: reviewed.length,
        cachedPositions: cacheHits,
        restoredProgress: isResume || restoredFromStorage,
      };
    } catch (reviewError) {
      if (isAbortError(reviewError) || controller.signal.aborted) {
        updateStatus("paused");
        return null;
      }

      updateStatus("error");
      setError(
        reviewError instanceof Error
          ? reviewError.message
          : "Не удалось разобрать партию.",
      );
      return null;
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
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

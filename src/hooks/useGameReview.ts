import { useState } from "react";
import type { Color } from "chess.js";
import type {
  GameReviewItem,
  GameReviewStatus,
} from "../analysis/gameReview";
import type { EngineAnalysis } from "../types/chess";
import { getFullMoveNumber, getTurnFromFen, getVerdict, getWhiteEvaluation, isMoveMatchingBestMove } from "../analysis/reviewRules";
type ReviewMove = { from: string; to: string };
type AnalyzePosition = (options: { fen: string; isGameOver: boolean; movetime?: number }) => Promise<EngineAnalysis | null>;
export function useGameReview() {
  const [status, setStatus] = useState<GameReviewStatus>("idle");
  const [items, setItems] = useState<GameReviewItem[]>([]);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  function reset() { setStatus("idle"); setItems([]); setProgress(0); setError(""); }
  async function run({ fenHistory, moveHistory, calculatePositionAnalysis, reviewSide }: { fenHistory: string[]; moveHistory: ReviewMove[]; calculatePositionAnalysis: AnalyzePosition; reviewSide?: Color }) {
    if (status === "running") return;
    const total = Math.min(moveHistory.length, Math.max(0, fenHistory.length - 1), 24);
    if (total === 0) return;
    setStatus("running"); setItems([]); setProgress(0); setError("");
    const reviewed: GameReviewItem[] = [];
    const analysisCache = new Map<string, EngineAnalysis | null>();
    const analyzeFen = async (fen: string, movetime: number) => {
      if (analysisCache.has(fen)) {
        return analysisCache.get(fen) ?? null;
      }

      const result = await calculatePositionAnalysis({
        fen,
        isGameOver: false,
        movetime,
      });
      analysisCache.set(fen, result);
      return result;
    };

    try {
      for (let index = 0; index < total; index += 1) {
        const beforeFen = fenHistory[index]; const afterFen = fenHistory[index + 1]; const move = moveHistory[index];
        if (!beforeFen || !afterFen || !move) { setProgress(index + 1); continue; }
        const side = getTurnFromFen(beforeFen); const playedMove = `${move.from}${move.to}`;
        const before = await analyzeFen(beforeFen, 650);
        if (!before?.bestMove) { setProgress(index + 1); continue; }
        const after = await analyzeFen(afterFen, 450);
        const matchedBestMove = isMoveMatchingBestMove({ playedMove, bestMove: before.bestMove });
        const beforeScore = getWhiteEvaluation(before, side);
        const afterScore = after ? getWhiteEvaluation(after, getTurnFromFen(afterFen)) : null;
        const loss = afterScore === null ? null : Math.max(0, side === "w" ? beforeScore - afterScore : afterScore - beforeScore);
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
        setItems([...reviewed]); setProgress(index + 1);
      }
      setStatus("done");
    } catch (reviewError) {
      setStatus("error"); setError(reviewError instanceof Error ? reviewError.message : "Не удалось разобрать партию.");
    }
  }
  return { status, items, progress, error, run, reset };
}

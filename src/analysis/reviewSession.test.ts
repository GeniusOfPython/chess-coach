import { afterEach, describe, expect, it } from "vitest";
import type { EngineAnalysis } from "../types/chess";
import {
  cacheReviewAnalysis,
  clearReviewAnalysisCache,
  clearReviewCheckpoint,
  createReviewSignature,
  getCachedReviewAnalysis,
  readReviewCheckpoint,
  saveReviewCheckpoint,
} from "./reviewSession";

const analysis: EngineAnalysis = {
  rank: 1,
  bestMove: "e2e4",
  evaluation: 0.28,
  mate: null,
  depth: 12,
  variation: ["e2e4", "e7e5"],
  lines: [{
    rank: 1,
    bestMove: "e2e4",
    evaluation: 0.28,
    mate: null,
    depth: 12,
    variation: ["e2e4", "e7e5"],
  }],
};

afterEach(() => {
  clearReviewAnalysisCache();
  clearReviewCheckpoint();
});

describe("review session", () => {
  it("reuses only an analysis with sufficient calculation time", () => {
    cacheReviewAnalysis({
      fen: "test-fen",
      movetime: 650,
      analysis,
      now: 1_000,
    });

    expect(getCachedReviewAnalysis({
      fen: "test-fen",
      movetime: 450,
      now: 1_001,
    })).toEqual(analysis);
    expect(getCachedReviewAnalysis({
      fen: "test-fen",
      movetime: 900,
      now: 1_001,
    })).toBeNull();
  });

  it("restores progress only for the same game", () => {
    const signature = createReviewSignature({
      fenHistory: ["fen-1", "fen-2"],
      moveHistory: [{ from: "e2", to: "e4" }],
      reviewSide: "w",
    });

    saveReviewCheckpoint({
      signature,
      total: 1,
      nextIndex: 1,
      items: [],
    });

    expect(readReviewCheckpoint({ signature, total: 1 })?.nextIndex).toBe(1);
    expect(readReviewCheckpoint({ signature: "another-game", total: 1 })).toBeNull();
  });
});

import type { Dispatch, SetStateAction } from "react";
import type { Color } from "chess.js";
import type { LearningJournalItem } from "../analysis/learningJournal";
import {
  getFullMoveNumber,
  getTurnFromFen,
  getVerdict,
  getWhiteEvaluation,
  isMoveMatchingBestMove,
  shouldAddToLearningJournal,
} from "../analysis/reviewRules";
import type { MoveReview } from "../components/MoveReviewPanel";
import type { RewardToastMessage } from "../components/RewardToast";
import type { EngineAnalysis } from "../types/chess";

type CalculatePositionAnalysis = (options: {
  fen: string;
  isGameOver: boolean;
  movetime?: number;
}) => Promise<EngineAnalysis | null>;

type ReviewMoveOptions = {
  playedMove: string;
  positionBeforeMove: string;
  positionAfterMove: string;
  movingSide: Color;
  suggestedBestMove: string | null;
  evaluationBeforeWhite: number | null;
};

type UseMoveReviewOptions = {
  calculatePositionAnalysis: CalculatePositionAnalysis;
  setLastMoveReview: Dispatch<SetStateAction<MoveReview | null>>;
  addLearningJournalItem: (item: LearningJournalItem) => void;
  showRewardToast: (message: Omit<RewardToastMessage, "id">) => void;
};

export function createInitialMoveReview({
  playedMove,
  positionBeforeMove,
  suggestedBestMove,
  evaluationBeforeWhite,
}: Pick<
  ReviewMoveOptions,
  | "playedMove"
  | "positionBeforeMove"
  | "suggestedBestMove"
  | "evaluationBeforeWhite"
>): MoveReview {
  const matchedBestMove = suggestedBestMove === null
    ? null
    : isMoveMatchingBestMove({
        playedMove,
        bestMove: suggestedBestMove,
      });

  const evaluationLoss = matchedBestMove ? 0 : null;

  return {
    playedMove,
    bestMove: suggestedBestMove,
    matchedBestMove,
    positionBeforeMove,
    isEvaluating:
      suggestedBestMove === null ||
      (evaluationBeforeWhite !== null && !matchedBestMove),
    evaluationBeforeWhite,
    evaluationAfterWhite: null,
    evaluationLoss,
    verdict: getVerdict({ matchedBestMove, evaluationLoss }),
  };
}

export function useMoveReview({
  calculatePositionAnalysis,
  setLastMoveReview,
  addLearningJournalItem,
  showRewardToast,
}: UseMoveReviewOptions) {
  function updateCurrentReview(
    playedMove: string,
    positionBeforeMove: string,
    update: (review: MoveReview) => MoveReview,
  ) {
    setLastMoveReview((currentReview) => {
      if (
        !currentReview ||
        currentReview.playedMove !== playedMove ||
        currentReview.positionBeforeMove !== positionBeforeMove
      ) {
        return currentReview;
      }

      return update(currentReview);
    });
  }

  function reviewAfterMove({
    playedMove,
    positionBeforeMove,
    positionAfterMove,
    movingSide,
    bestMove,
    evaluationBeforeWhite,
  }: Omit<ReviewMoveOptions, "suggestedBestMove"> & {
    bestMove: string;
    evaluationBeforeWhite: number;
  }) {
    void calculatePositionAnalysis({
      fen: positionAfterMove,
      isGameOver: false,
      movetime: 900,
    }).then((afterAnalysis) => {
      if (!afterAnalysis) {
        updateCurrentReview(
          playedMove,
          positionBeforeMove,
          (review) => ({ ...review, isEvaluating: false }),
        );
        return;
      }

      const evaluationAfterWhite = getWhiteEvaluation(
        afterAnalysis,
        getTurnFromFen(positionAfterMove),
      );
      const rawLoss = movingSide === "w"
        ? evaluationBeforeWhite - evaluationAfterWhite
        : evaluationAfterWhite - evaluationBeforeWhite;
      const evaluationLoss = Math.max(0, rawLoss);
      const verdict = getVerdict({
        matchedBestMove: false,
        evaluationLoss,
      });

      if (shouldAddToLearningJournal(verdict)) {
        addLearningJournalItem({
          id: `${positionBeforeMove}-${playedMove}`,
          moveNumber: getFullMoveNumber(positionBeforeMove),
          side: movingSide,
          playedMove,
          bestMove,
          verdict,
          evaluationLoss,
        });
      }

      updateCurrentReview(
        playedMove,
        positionBeforeMove,
        (review) => ({
          ...review,
          isEvaluating: false,
          evaluationAfterWhite,
          evaluationLoss,
          verdict,
        }),
      );
    });
  }

  function reviewWithoutSuggestion(options: ReviewMoveOptions) {
    void calculatePositionAnalysis({
      fen: options.positionBeforeMove,
      isGameOver: false,
      movetime: 700,
    }).then((beforeAnalysis) => {
      if (!beforeAnalysis?.bestMove) {
        updateCurrentReview(
          options.playedMove,
          options.positionBeforeMove,
          (review) => ({ ...review, isEvaluating: false }),
        );
        return;
      }

      const bestMove = beforeAnalysis.bestMove;
      const matchedBestMove = isMoveMatchingBestMove({
        playedMove: options.playedMove,
        bestMove,
      });
      const evaluationBeforeWhite = getWhiteEvaluation(
        beforeAnalysis,
        options.movingSide,
      );

      updateCurrentReview(
        options.playedMove,
        options.positionBeforeMove,
        (review) => ({
          ...review,
          bestMove,
          matchedBestMove,
          evaluationBeforeWhite,
          evaluationLoss: matchedBestMove ? 0 : null,
          verdict: getVerdict({
            matchedBestMove,
            evaluationLoss: matchedBestMove ? 0 : null,
          }),
          isEvaluating: !matchedBestMove,
        }),
      );

      if (matchedBestMove) {
        showRewardToast({
          kind: "success",
          title: "Сильный ход",
          text: "Расчёт подтверждает: сыгран лучший вариант.",
        });
        return;
      }

      reviewAfterMove({
        ...options,
        bestMove,
        evaluationBeforeWhite,
      });
    });
  }

  function reviewMove(options: ReviewMoveOptions) {
    const initialReview = createInitialMoveReview(options);
    setLastMoveReview(initialReview);

    if (
      options.suggestedBestMove !== null &&
      options.evaluationBeforeWhite !== null &&
      !initialReview.matchedBestMove
    ) {
      reviewAfterMove({
        ...options,
        bestMove: options.suggestedBestMove,
        evaluationBeforeWhite: options.evaluationBeforeWhite,
      });
    } else if (options.suggestedBestMove === null) {
      reviewWithoutSuggestion(options);
    }

    return initialReview;
  }

  return { reviewMove };
}

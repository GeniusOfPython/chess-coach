import type { CSSProperties } from "react";
import { Chessboard } from "react-chessboard";
import { ANALYSIS_LINE_COLORS } from "../theme/analysisPalette";

export type LastMoveSquares = {
  from: string;
  to: string;
};

type BoardOrientation = "white" | "black";

type Props = {
  position: string;
  bestMove?: string;
  candidateMoves?: string[];
  boardOrientation?: BoardOrientation;
  lastMove?: LastMoveSquares | null;
  selectedSquare?: string | null;
  legalMoveSquares?: string[];
  checkSquare?: string | null;
  showAnalysisArrows?: boolean;
  onSquareClick?: (square: string) => void;
  onPieceDrop: (args: {
    sourceSquare: string;
    targetSquare: string | null;
  }) => boolean;
};

function createArrow(move: string, color: string) {
  return {
    startSquare: move.slice(0, 2),
    endSquare: move.slice(2, 4),
    color,
  };
}

function createLastMoveStyles(
  lastMove: LastMoveSquares | null | undefined,
): Record<string, CSSProperties> {
  if (!lastMove) {
    return {};
  }

  return {
    [lastMove.from]: {
      background:
        "radial-gradient(circle, rgba(255, 207, 74, 0.88) 0%, rgba(255, 138, 61, 0.40) 56%, transparent 80%)",
    },
    [lastMove.to]: {
      background:
        "radial-gradient(circle, rgba(255, 207, 74, 0.96) 0%, rgba(255, 60, 172, 0.40) 56%, transparent 80%)",
    },
  };
}

function createSelectionStyles({
  selectedSquare,
  legalMoveSquares,
}: {
  selectedSquare: string | null | undefined;
  legalMoveSquares: string[];
}): Record<string, CSSProperties> {
  const styles: Record<string, CSSProperties> = {};

  if (selectedSquare) {
    styles[selectedSquare] = {
      background:
        "radial-gradient(circle, rgba(0, 229, 255, 0.92) 0%, rgba(255, 60, 172, 0.38) 58%, transparent 82%)",
    };
  }

  legalMoveSquares.forEach((square) => {
    styles[square] = {
      background:
        "radial-gradient(circle, rgba(0, 229, 255, 0.94) 0%, rgba(0, 229, 255, 0.42) 23%, transparent 28%)",
    };
  });

  return styles;
}

function createCheckStyles(
  checkSquare: string | null | undefined,
): Record<string, CSSProperties> {
  if (!checkSquare) {
    return {};
  }

  return {
    [checkSquare]: {
      background:
        "radial-gradient(circle, rgba(255, 71, 120, 0.98) 0%, rgba(157, 23, 77, 0.58) 58%, transparent 82%)",
    },
  };
}

function mergeSquareStyles(
  ...styleGroups: Record<string, CSSProperties>[]
) {
  return styleGroups.reduce<Record<string, CSSProperties>>(
    (mergedStyles, group) => {
      Object.entries(group).forEach(([square, styles]) => {
        mergedStyles[square] = {
          ...(mergedStyles[square] ?? {}),
          ...styles,
        };
      });

      return mergedStyles;
    },
    {},
  );
}

export default function ChessBoard({
  position,
  bestMove,
  candidateMoves = [],
  boardOrientation = "white",
  lastMove = null,
  selectedSquare = null,
  legalMoveSquares = [],
  checkSquare = null,
  showAnalysisArrows = true,
  onSquareClick,
  onPieceDrop,
}: Props) {
  const uniqueCandidates = candidateMoves.filter(
    (move, index, array) =>
      move &&
      move !== bestMove &&
      array.indexOf(move) === index,
  );

  const arrows = showAnalysisArrows
    ? [
        ...(bestMove
          ? [createArrow(bestMove, ANALYSIS_LINE_COLORS[0])]
          : []),
        ...uniqueCandidates
          .slice(0, 2)
          .map((move, index) =>
            createArrow(move, ANALYSIS_LINE_COLORS[index + 1]),
          ),
      ]
    : [];

  const squareStyles = mergeSquareStyles(
    createLastMoveStyles(lastMove),
    createSelectionStyles({
      selectedSquare,
      legalMoveSquares,
    }),
    createCheckStyles(checkSquare),
  );

  return (
    <Chessboard
      options={{
        position,
        boardOrientation,
        onPieceDrop,
        onSquareClick: ({ square }) => {
          onSquareClick?.(square);
        },
        arrows,
        squareStyles,
        boardStyle: {
          borderRadius: "14px",
          boxShadow:
            "0 20px 54px rgba(0, 0, 0, 0.48), 0 0 30px rgba(255, 60, 172, 0.18), 0 0 20px rgba(0, 229, 255, 0.12)",
        },
        darkSquareStyle: {
          backgroundColor: "#a855c7",
        },
        lightSquareStyle: {
          backgroundColor: "#f6c7e8",
        },
      }}
    />
  );
}

import type { CSSProperties } from "react";
import { Chessboard } from "react-chessboard";

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
        "radial-gradient(circle, rgba(255, 224, 102, 0.72) 0%, rgba(255, 224, 102, 0.32) 55%, transparent 78%)",
    },
    [lastMove.to]: {
      background:
        "radial-gradient(circle, rgba(255, 224, 102, 0.82) 0%, rgba(255, 224, 102, 0.38) 55%, transparent 78%)",
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
        "radial-gradient(circle, rgba(70, 140, 255, 0.74) 0%, rgba(70, 140, 255, 0.34) 58%, transparent 80%)",
    };
  }

  legalMoveSquares.forEach((square) => {
    styles[square] = {
      background:
        "radial-gradient(circle, rgba(60, 200, 90, 0.82) 0%, rgba(60, 200, 90, 0.36) 23%, transparent 27%)",
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
        "radial-gradient(circle, rgba(255, 82, 82, 0.9) 0%, rgba(255, 82, 82, 0.48) 58%, transparent 82%)",
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
  onSquareClick,
  onPieceDrop,
}: Props) {
  const uniqueCandidates = candidateMoves.filter(
    (move, index, array) =>
      move &&
      move !== bestMove &&
      array.indexOf(move) === index,
  );

  const arrowColors = [
    "rgba(60, 200, 90, 0.90)",
    "rgba(70, 140, 255, 0.82)",
    "rgba(255, 170, 40, 0.78)",
  ];

  const arrows = [
    ...(bestMove
      ? [createArrow(bestMove, arrowColors[0])]
      : []),
    ...uniqueCandidates
      .slice(0, 2)
      .map((move, index) =>
        createArrow(move, arrowColors[index + 1]),
      ),
  ];

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
          borderRadius: "10px",
          boxShadow: "0 14px 40px rgba(0,0,0,.3)",
        },
        darkSquareStyle: {
          backgroundColor: "#657a61",
        },
        lightSquareStyle: {
          backgroundColor: "#d7ddc8",
        },
      }}
    />
  );
}

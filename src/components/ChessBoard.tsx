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

export default function ChessBoard({
  position,
  bestMove,
  candidateMoves = [],
  boardOrientation = "white",
  lastMove = null,
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

  return (
    <Chessboard
      options={{
        position,
        boardOrientation,
        onPieceDrop,
        arrows,
        squareStyles: createLastMoveStyles(lastMove),
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

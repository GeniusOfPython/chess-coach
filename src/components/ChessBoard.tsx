import { Chessboard } from "react-chessboard";

type BoardOrientation = "white" | "black";

type Props = {
  position: string;
  bestMove?: string;
  candidateMoves?: string[];
  boardOrientation?: BoardOrientation;
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

export default function ChessBoard({
  position,
  bestMove,
  candidateMoves = [],
  boardOrientation = "white",
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

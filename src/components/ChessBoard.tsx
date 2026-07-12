import { Chessboard } from "react-chessboard";

type Props = {
  position: string;
  bestMove?: string;
  onPieceDrop: (args: {
    sourceSquare: string;
    targetSquare: string | null;
  }) => boolean;
};

export default function ChessBoard({
  position,
  bestMove,
  onPieceDrop,
}: Props) {
  const arrows = bestMove
    ? [
        {
          startSquare: bestMove.slice(0, 2),
          endSquare: bestMove.slice(2, 4),
          color: "rgba(70, 180, 90, 0.85)",
        },
      ]
    : [];

  return (
    <Chessboard
      options={{
        position,
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
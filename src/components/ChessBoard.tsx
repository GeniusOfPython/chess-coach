import { Chessboard } from "react-chessboard";

type Props = {
  position: string;
  onPieceDrop: (args: {
    sourceSquare: string;
    targetSquare: string | null;
  }) => boolean;
};

export default function ChessBoard({
  position,
  onPieceDrop,
}: Props) {
  return (
    <Chessboard
      options={{
        position,
        onPieceDrop,
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
import type { CSSProperties } from "react";
import {
  Chessboard,
  defaultPieces,
  type PieceRenderObject,
} from "react-chessboard";
import { ANALYSIS_LINE_COLORS } from "../theme/analysisPalette";
import {
  getBoardTheme,
  type BoardThemeId,
} from "../theme/boardThemes";

export type LastMoveSquares = {
  from: string;
  to: string;
};

type BoardOrientation = "white" | "black";

const accessiblePieceNames: Record<string, string> = {
  wP: "Белая пешка",
  wN: "Белый конь",
  wB: "Белый слон",
  wR: "Белая ладья",
  wQ: "Белый ферзь",
  wK: "Белый король",
  bP: "Чёрная пешка",
  bN: "Чёрный конь",
  bB: "Чёрный слон",
  bR: "Чёрная ладья",
  bQ: "Чёрный ферзь",
  bK: "Чёрный король",
};

const accessiblePieces = Object.fromEntries(
  Object.entries(defaultPieces).map(([pieceType, Piece]) => [
    pieceType,
    (props) => (
      <>
        <span className="visually-hidden">
          {accessiblePieceNames[pieceType] ?? "Шахматная фигура"}{" "}
          {props?.square ?? "вне доски"}
        </span>
        <Piece {...props} />
      </>
    ),
  ]),
) as PieceRenderObject;

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
  boardTheme?: BoardThemeId;
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
  boardTheme = "sunset",
  onSquareClick,
  onPieceDrop,
}: Props) {
  const selectedTheme = getBoardTheme(boardTheme);
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
        pieces: accessiblePieces,
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
          boxShadow: selectedTheme.shadow,
        },
        darkSquareStyle: {
          backgroundColor: selectedTheme.darkSquare,
        },
        lightSquareStyle: {
          backgroundColor: selectedTheme.lightSquare,
        },
      }}
    />
  );
}

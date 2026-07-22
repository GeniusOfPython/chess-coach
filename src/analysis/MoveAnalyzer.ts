import {
  Chess,
  type Color,
  type PieceSymbol,
  type Square,
} from "chess.js";

export type MoveAnalysis = {
  isLegal: boolean;
  originalMove: string;
  from: string;
  to: string;
  promotion: string;
  san: string;
  piece: PieceSymbol | null;
  pieceColor: Color | null;
  pieceName: string;
  capturedPiece: PieceSymbol | null;
  capturedPieceName: string | null;
  isCapture: boolean;
  isCheck: boolean;
  isCheckmate: boolean;
  isCastle: boolean;
  isPromotion: boolean;
  isDevelopment: boolean;
  isCenterMove: boolean;
  isSupported: boolean;
  isOpening: boolean;
  opensDevelopmentLine: boolean;
  isEarlyQueenMove: boolean;
};

const pieceNames: Record<PieceSymbol, string> = {
  p: "пешка",
  n: "конь",
  b: "слон",
  r: "ладья",
  q: "ферзь",
  k: "король",
};

const centerSquares = new Set(["d4", "e4", "d5", "e5"]);

const startingSquares = new Set([
  "b1",
  "g1",
  "c1",
  "f1",
  "d1",
  "a1",
  "h1",
  "b8",
  "g8",
  "c8",
  "f8",
  "d8",
  "a8",
  "h8",
]);

function parseFullMoveNumber(fen: string) {
  const fullMoveNumber = Number(fen.split(" ")[5]);

  return Number.isFinite(fullMoveNumber)
    ? fullMoveNumber
    : 1;
}

function getSupportCount(
  game: Chess,
  square: Square,
  color: Color,
) {
  const extendedGame = game as unknown as {
    attackers?: (
      square: Square,
      color?: Color,
    ) => Square[];
  };

  if (typeof extendedGame.attackers !== "function") {
    return 0;
  }

  try {
    return extendedGame.attackers(square, color).length;
  } catch {
    return 0;
  }
}

function createInvalidAnalysis(
  engineMove: string,
): MoveAnalysis {
  return {
    isLegal: false,
    originalMove: engineMove,
    from: engineMove.slice(0, 2),
    to: engineMove.slice(2, 4),
    promotion: engineMove.slice(4),
    san: "",
    piece: null,
    pieceColor: null,
    pieceName: "фигура",
    capturedPiece: null,
    capturedPieceName: null,
    isCapture: false,
    isCheck: false,
    isCheckmate: false,
    isCastle: false,
    isPromotion: false,
    isDevelopment: false,
    isCenterMove: false,
    isSupported: false,
    isOpening: false,
    opensDevelopmentLine: false,
    isEarlyQueenMove: false,
  };
}

export function analyzeMove(
  fen: string,
  engineMove: string,
): MoveAnalysis {
  if (!/^[a-h][1-8][a-h][1-8][qrbn]?$/u.test(engineMove)) {
    return createInvalidAnalysis(engineMove);
  }

  const from = engineMove.slice(0, 2) as Square;
  const to = engineMove.slice(2, 4) as Square;
  const promotion = engineMove.slice(4);

  let game: Chess;

  try {
    game = new Chess(fen);
  } catch {
    return createInvalidAnalysis(engineMove);
  }

  const movingPiece = game.get(from);
  const targetPiece = game.get(to);

  if (!movingPiece) {
    return createInvalidAnalysis(engineMove);
  }

  const fullMoveNumber = parseFullMoveNumber(fen);
  const isOpening = fullMoveNumber <= 10;

  let moveResult: {
    san?: string;
    captured?: PieceSymbol;
    promotion?: PieceSymbol;
  } | null = null;

  try {
    moveResult = game.move({
      from,
      to,
      promotion: promotion || "q",
    });
  } catch {
    return createInvalidAnalysis(engineMove);
  }

  if (!moveResult) {
    return createInvalidAnalysis(engineMove);
  }

  const isCastle =
    movingPiece.type === "k" &&
    Math.abs(
      from.charCodeAt(0) - to.charCodeAt(0),
    ) === 2;

  const capturedPiece =
    moveResult.captured ?? targetPiece?.type ?? null;

  const isPromotion = Boolean(
    promotion || moveResult.promotion,
  );

  const isDevelopment =
    isOpening &&
    movingPiece.type !== "p" &&
    movingPiece.type !== "k" &&
    startingSquares.has(from);

  const opensDevelopmentLine =
    isOpening &&
    movingPiece.type === "p" &&
    ["c", "d", "e"].includes(from.charAt(0));

  const isCenterMove = centerSquares.has(to);

  const supportCount = getSupportCount(
    game,
    to,
    movingPiece.color,
  );

  const isCheckmate = game.isCheckmate();
  const isCheck = !isCheckmate && game.inCheck();

  return {
    isLegal: true,
    originalMove: engineMove,
    from,
    to,
    promotion,
    san: moveResult.san ?? "",
    piece: movingPiece.type,
    pieceColor: movingPiece.color,
    pieceName: pieceNames[movingPiece.type],
    capturedPiece,
    capturedPieceName: capturedPiece
      ? pieceNames[capturedPiece]
      : null,
    isCapture: Boolean(capturedPiece),
    isCheck,
    isCheckmate,
    isCastle,
    isPromotion,
    isDevelopment,
    isCenterMove,
    isSupported: supportCount > 0,
    isOpening,
    opensDevelopmentLine,
    isEarlyQueenMove:
      isOpening && movingPiece.type === "q",
  };
}

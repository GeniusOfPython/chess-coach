import { Chess, type PieceSymbol } from "chess.js";
import "./MaterialPanel.css";

type Props = {
  fen: string;
};

type CapturedPieces = Record<PieceSymbol, number>;

const pieceValues: Record<PieceSymbol, number> = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
  k: 0,
};

const startingPieces: CapturedPieces = {
  p: 8,
  n: 2,
  b: 2,
  r: 2,
  q: 1,
  k: 1,
};

const pieceSymbols: Record<PieceSymbol, string> = {
  p: "♟",
  n: "♞",
  b: "♝",
  r: "♜",
  q: "♛",
  k: "♚",
};

const pieceOrder: PieceSymbol[] = ["q", "r", "b", "n", "p"];

function createEmptyPieceCount(): CapturedPieces {
  return {
    p: 0,
    n: 0,
    b: 0,
    r: 0,
    q: 0,
    k: 0,
  };
}

function getMaterialFromFen(fen: string) {
  const game = new Chess(fen);
  const board = game.board();
  const whitePieces = createEmptyPieceCount();
  const blackPieces = createEmptyPieceCount();

  board.forEach((row) => {
    row.forEach((piece) => {
      if (!piece) {
        return;
      }

      if (piece.color === "w") {
        whitePieces[piece.type] += 1;
        return;
      }

      blackPieces[piece.type] += 1;
    });
  });

  const whiteScore = getMaterialScore(whitePieces);
  const blackScore = getMaterialScore(blackPieces);

  return {
    whitePieces,
    blackPieces,
    whiteCaptured: getCapturedPieces(blackPieces),
    blackCaptured: getCapturedPieces(whitePieces),
    whiteScore,
    blackScore,
    materialBalance: whiteScore - blackScore,
  };
}

function getMaterialScore(pieces: CapturedPieces) {
  return Object.entries(pieces).reduce(
    (total, [piece, count]) =>
      total + pieceValues[piece as PieceSymbol] * count,
    0,
  );
}

function getCapturedPieces(currentPieces: CapturedPieces) {
  const capturedPieces = createEmptyPieceCount();

  pieceOrder.forEach((piece) => {
    capturedPieces[piece] = Math.max(
      0,
      startingPieces[piece] - currentPieces[piece],
    );
  });

  return capturedPieces;
}

function formatBalance(balance: number) {
  if (balance === 0) {
    return "Материал равный";
  }

  return balance > 0
    ? `Белые впереди на ${balance}`
    : `Чёрные впереди на ${Math.abs(balance)}`;
}

function renderCapturedPieces(pieces: CapturedPieces) {
  const renderedPieces = pieceOrder.flatMap((piece) =>
    Array.from({ length: pieces[piece] }, (_, index) => (
      <span key={`${piece}-${index}`}>{pieceSymbols[piece]}</span>
    )),
  );

  if (renderedPieces.length === 0) {
    return <span className="material-empty">нет</span>;
  }

  return renderedPieces;
}

export default function MaterialPanel({ fen }: Props) {
  let material;

  try {
    material = getMaterialFromFen(fen);
  } catch {
    return (
      <div className="material-card">
        <span className="status-label">Материал</span>
        <p className="material-empty">
          Не удалось рассчитать материал для текущей позиции.
        </p>
      </div>
    );
  }

  return (
    <div className="material-card">
      <span className="status-label">Материал</span>

      <div className="material-balance">
        <strong>{formatBalance(material.materialBalance)}</strong>

        <span>
          Белые: {material.whiteScore} · Чёрные: {material.blackScore}
        </span>
      </div>

      <div className="material-captured-list">
        <div className="material-captured-row">
          <span>Белые забрали</span>
          <div className="material-pieces white">
            {renderCapturedPieces(material.whiteCaptured)}
          </div>
        </div>

        <div className="material-captured-row">
          <span>Чёрные забрали</span>
          <div className="material-pieces black">
            {renderCapturedPieces(material.blackCaptured)}
          </div>
        </div>
      </div>
    </div>
  );
}

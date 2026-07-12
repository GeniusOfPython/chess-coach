import { Chess, type Color, type PieceSymbol, type Square } from "chess.js";

export type TacticalMotif = {
  id: string;
  title: string;
  description: string;
  severity: "forcing" | "gain" | "positional";
};

type BoardPiece = {
  square: Square;
  type: PieceSymbol;
  color: Color;
};

const pieceNames: Record<PieceSymbol, string> = {
  p: "пешку",
  n: "коня",
  b: "слона",
  r: "ладью",
  q: "ферзя",
  k: "короля",
};

const valuablePieces = new Set<PieceSymbol>(["q", "r", "b", "n", "k"]);

function fileIndex(square: string) {
  return square.charCodeAt(0) - "a".charCodeAt(0);
}

function rankIndex(square: string) {
  return Number(square[1]) - 1;
}

function toSquare(file: number, rank: number): Square | null {
  if (file < 0 || file > 7 || rank < 0 || rank > 7) {
    return null;
  }

  return `${String.fromCharCode("a".charCodeAt(0) + file)}${rank + 1}` as Square;
}

function getBoardPieces(game: Chess) {
  const pieces: BoardPiece[] = [];

  for (let file = 0; file < 8; file += 1) {
    for (let rank = 0; rank < 8; rank += 1) {
      const square = toSquare(file, rank);

      if (!square) {
        continue;
      }

      const piece = game.get(square);

      if (piece) {
        pieces.push({
          square,
          type: piece.type,
          color: piece.color,
        });
      }
    }
  }

  return pieces;
}

function isPathClear(game: Chess, from: Square, to: Square) {
  const fromFile = fileIndex(from);
  const fromRank = rankIndex(from);
  const toFile = fileIndex(to);
  const toRank = rankIndex(to);

  const fileStep = Math.sign(toFile - fromFile);
  const rankStep = Math.sign(toRank - fromRank);

  let file = fromFile + fileStep;
  let rank = fromRank + rankStep;

  while (file !== toFile || rank !== toRank) {
    const square = toSquare(file, rank);

    if (!square) {
      return false;
    }

    if (game.get(square)) {
      return false;
    }

    file += fileStep;
    rank += rankStep;
  }

  return true;
}

function pieceAttacksSquare({
  game,
  piece,
  from,
  target,
}: {
  game: Chess;
  piece: PieceSymbol;
  from: Square;
  target: Square;
}) {
  const df = fileIndex(target) - fileIndex(from);
  const dr = rankIndex(target) - rankIndex(from);
  const absDf = Math.abs(df);
  const absDr = Math.abs(dr);

  if (piece === "n") {
    return (
      (absDf === 1 && absDr === 2) ||
      (absDf === 2 && absDr === 1)
    );
  }

  if (piece === "b") {
    return absDf === absDr && isPathClear(game, from, target);
  }

  if (piece === "r") {
    return (df === 0 || dr === 0) && isPathClear(game, from, target);
  }

  if (piece === "q") {
    const isDiagonal = absDf === absDr;
    const isStraight = df === 0 || dr === 0;

    return (isDiagonal || isStraight) && isPathClear(game, from, target);
  }

  if (piece === "k") {
    return absDf <= 1 && absDr <= 1;
  }

  if (piece === "p") {
    return absDf === 1 && Math.abs(dr) === 1;
  }

  return false;
}

function formatMove(move: string) {
  const from = move.slice(0, 2);
  const to = move.slice(2, 4);

  return `${from} → ${to}`;
}

export function detectTacticalMotifs(
  fen: string,
  engineMove: string,
): TacticalMotif[] {
  if (!engineMove || engineMove === "(none)") {
    return [];
  }

  const from = engineMove.slice(0, 2) as Square;
  const to = engineMove.slice(2, 4) as Square;
  const promotion = engineMove.slice(4);
  const game = new Chess(fen);
  const movingPiece = game.get(from);
  const targetPiece = game.get(to);

  if (!movingPiece) {
    return [];
  }

  const motifs: TacticalMotif[] = [];

  try {
    const move = game.move({
      from,
      to,
      promotion: promotion || "q",
    });

    if (!move) {
      return [];
    }

    if (game.isCheckmate()) {
      motifs.push({
        id: "mate",
        title: "Матовая угроза",
        description: "Ход сразу ставит мат. Это главный forcing-мотив позиции.",
        severity: "forcing",
      });
    } else if (game.inCheck()) {
      motifs.push({
        id: "check",
        title: "Шах",
        description: "Ход заставляет соперника сначала решать проблему короля.",
        severity: "forcing",
      });
    }

    const capturedPiece = move.captured ?? targetPiece?.type ?? null;

    if (capturedPiece) {
      motifs.push({
        id: "capture",
        title: "Взятие материала",
        description: `Ход ${formatMove(engineMove)} забирает ${pieceNames[capturedPiece]} соперника.`,
        severity: "gain",
      });
    }

    if (move.promotion || promotion) {
      motifs.push({
        id: "promotion",
        title: "Превращение пешки",
        description: "Пешка проходит в ферзи или другую сильную фигуру.",
        severity: "forcing",
      });
    }

    const attackedPieces = getBoardPieces(game).filter((piece) => {
      if (piece.color === movingPiece.color) {
        return false;
      }

      if (!valuablePieces.has(piece.type)) {
        return false;
      }

      return pieceAttacksSquare({
        game,
        piece: movingPiece.type,
        from: to,
        target: piece.square,
      });
    });

    const attackedQueen = attackedPieces.find(
      (piece) => piece.type === "q",
    );

    if (attackedPieces.length >= 2) {
      motifs.push({
        id: "fork",
        title: "Вилка / двойная угроза",
        description: "Фигура после хода атакует сразу несколько важных целей. Сопернику трудно защитить всё за один ход.",
        severity: "forcing",
      });
    } else if (attackedQueen) {
      motifs.push({
        id: "queen-attack",
        title: "Нападение на ферзя",
        description: "Ход создаёт темп: атакует ферзя и заставляет соперника реагировать.",
        severity: "gain",
      });
    }

    const isCastle =
      movingPiece.type === "k" &&
      Math.abs(from.charCodeAt(0) - to.charCodeAt(0)) === 2;

    if (isCastle) {
      motifs.push({
        id: "castle",
        title: "Безопасность короля",
        description: "Рокировка убирает короля из центра и подключает ладью.",
        severity: "positional",
      });
    }

    return motifs.slice(0, 3);
  } catch {
    return [];
  }
}

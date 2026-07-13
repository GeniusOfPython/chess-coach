import { Chess, type PieceSymbol, type Square } from "chess.js";

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

function getFullMoveNumber(fen: string) {
  const value = Number(fen.split(" ")[5]);

  return Number.isFinite(value) ? value : 1;
}

function getAttackersCount(
  game: Chess,
  square: Square,
  color: "w" | "b",
) {
  const gameWithAttackers = game as unknown as {
    attackers?: (
      square: Square,
      color?: "w" | "b",
    ) => Square[];
  };

  if (typeof gameWithAttackers.attackers !== "function") {
    return 0;
  }

  try {
    return gameWithAttackers.attackers(square, color).length;
  } catch {
    return 0;
  }
}

export function explainEngineMove(
  fen: string,
  engineMove: string,
): string[] {
  if (!engineMove || engineMove === "(none)") {
    return ["В этой позиции допустимого хода нет."];
  }

  const from = engineMove.slice(0, 2) as Square;
  const to = engineMove.slice(2, 4) as Square;
  const promotion = engineMove.slice(4);

  const game = new Chess(fen);
  const movingPiece = game.get(from);
  const targetPiece = game.get(to);

  if (!movingPiece) {
    return ["Не удалось определить фигуру, которая делает ход."];
  }

  const explanations: string[] = [];
  const fullMoveNumber = getFullMoveNumber(fen);
  const isOpening = fullMoveNumber <= 10;

  try {
    const move = game.move({
      from,
      to,
      promotion: promotion || "q",
    });

    if (!move) {
      return ["Stockfish предложил ход, который не удалось применить к позиции."];
    }

    const isCastle =
      movingPiece.type === "k" &&
      Math.abs(from.charCodeAt(0) - to.charCodeAt(0)) === 2;

    const capturedPiece =
      move.captured ?? targetPiece?.type ?? null;

    const isDevelopment =
      isOpening &&
      movingPiece.type !== "p" &&
      movingPiece.type !== "k" &&
      startingSquares.has(from);

    const isCenterMove = centerSquares.has(to);

    const opensDevelopmentLine =
      isOpening &&
      movingPiece.type === "p" &&
      ["c", "d", "e"].includes(from[0]);

    const isEarlyQueenMove =
      isOpening && movingPiece.type === "q";

    const supportCount = getAttackersCount(
      game,
      to,
      movingPiece.color,
    );

    if (game.isCheckmate()) {
      explanations.push(
        "Ход ставит мат и немедленно завершает партию.",
      );
    }

    if (game.inCheck() && !game.isCheckmate()) {
      explanations.push(
        "Ход даёт шах и заставляет соперника отвечать на угрозу королю.",
      );
    }

    if (isCastle) {
      explanations.push(
        "Рокировка уводит короля в безопасность и подключает ладью к игре.",
      );
    }

    if (capturedPiece) {
      explanations.push(
        `Ход забирает ${pieceNames[capturedPiece]} соперника.`,
      );
    }

    if (promotion) {
      explanations.push(
        "Пешка достигает последней горизонтали и превращается в сильную фигуру.",
      );
    }

    if (isDevelopment) {
      explanations.push(
        `Развивает ${pieceNames[movingPiece.type]} с начальной позиции.`,
      );
    }

    if (isCenterMove) {
      explanations.push(
        "Занимает или усиливает контроль центра.",
      );
    }

    if (opensDevelopmentLine) {
      explanations.push(
        "Освобождает линии для развития фигур и улучшает координацию.",
      );
    }

    if (supportCount > 0) {
      explanations.push(
        "Фигура на конечном поле имеет поддержку.",
      );
    }

    if (isEarlyQueenMove && explanations.length <= 1) {
      explanations.push(
        "Ферзь выходит рано, но Stockfish считает это тактически оправданным в данной позиции.",
      );
    }

    if (explanations.length === 0) {
      explanations.push(
        "Ход улучшает позицию по расчёту Stockfish и ведёт к наиболее сильному продолжению.",
      );
    }

    return explanations.slice(0, 5);
  } catch {
    return ["Не удалось разобрать вариант Stockfish."];
  }
}
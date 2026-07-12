import { Chess, type Square } from "chess.js";

const pieceNames = {
  p: "пешку",
  n: "коня",
  b: "слона",
  r: "ладью",
  q: "ферзя",
  k: "короля",
} as const;

const centerSquares = new Set([
  "d4",
  "e4",
  "d5",
  "e5",
]);

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
    return ["Не удалось определить смысл хода."];
  }

  const explanations: string[] = [];
  const pieceName = pieceNames[movingPiece.type];

  if (targetPiece) {
    explanations.push(
      `Ход забирает ${pieceNames[targetPiece.type]} соперника.`,
    );
  }

  if (
    movingPiece.type !== "p" &&
    movingPiece.type !== "k"
  ) {
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

    if (startingSquares.has(from)) {
      explanations.push(
        `Развивает ${pieceName} с начальной позиции.`,
      );
    }
  }

  if (centerSquares.has(to)) {
    explanations.push(
      "Занимает или усиливает контроль центра.",
    );
  }

  if (
    movingPiece.type === "k" &&
    Math.abs(
      from.charCodeAt(0) - to.charCodeAt(0),
    ) === 2
  ) {
    explanations.push(
      "Выполняет рокировку и повышает безопасность короля.",
    );
  }

  if (promotion) {
    explanations.push(
      "Пешка достигает последней горизонтали и превращается в фигуру.",
    );
  }

  try {
    const move = game.move({
      from,
      to,
      promotion: promotion || "q",
    });

    if (move) {
      if (game.isCheckmate()) {
        explanations.push(
          "Ход ставит мат королю соперника.",
        );
      } else if (game.inCheck()) {
        explanations.push(
          "Ход даёт шах и заставляет соперника немедленно отвечать.",
        );
      }

      const movedPiece = game.get(to);

      if (
        movedPiece &&
        game.attackers(to, movingPiece.color).length > 0
      ) {
        explanations.push(
          "Фигура на конечном поле имеет поддержку.",
        );
      }
    }
  } catch {
    return ["Не удалось разобрать вариант Stockfish."];
  }

  if (explanations.length === 0) {
    explanations.push(
      "Ход улучшает позицию по расчёту Stockfish и подготавливает наиболее сильное продолжение.",
    );
  }

  return explanations;
}
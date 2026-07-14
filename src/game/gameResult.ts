import type { Chess } from "chess.js";

export type GameResultInfo = {
  isGameOver: boolean;
  title: string;
  description: string;
  result: string;
  winner: "white" | "black" | "draw" | null;
};

export function getGameResultInfo(game: Chess): GameResultInfo {
  if (!game.isGameOver()) {
    return {
      isGameOver: false,
      title: "Партия продолжается",
      description:
        "Когда партия закончится, здесь появится короткий итог: мат, пат или ничья.",
      result: "*",
      winner: null,
    };
  }

  if (game.isCheckmate()) {
    const winner = game.turn() === "w" ? "black" : "white";

    return {
      isGameOver: true,
      title:
        winner === "white"
          ? "Мат. Победили белые"
          : "Мат. Победили чёрные",
      description:
        "Король стороны, которая должна ходить, находится под шахом и не имеет легального способа защититься.",
      result: winner === "white" ? "1-0" : "0-1",
      winner,
    };
  }

  if (game.isStalemate()) {
    return {
      isGameOver: true,
      title: "Пат. Ничья",
      description:
        "Сторона, которая должна ходить, не находится под шахом, но у неё нет ни одного легального хода.",
      result: "1/2-1/2",
      winner: "draw",
    };
  }

  if (game.isThreefoldRepetition()) {
    return {
      isGameOver: true,
      title: "Ничья повторением позиции",
      description:
        "Одна и та же позиция возникла три раза. Такая партия считается ничейной.",
      result: "1/2-1/2",
      winner: "draw",
    };
  }

  if (game.isInsufficientMaterial()) {
    return {
      isGameOver: true,
      title: "Ничья из-за недостатка материала",
      description:
        "На доске осталось недостаточно фигур, чтобы поставить мат обычной игрой.",
      result: "1/2-1/2",
      winner: "draw",
    };
  }

  if (game.isDraw()) {
    return {
      isGameOver: true,
      title: "Ничья",
      description:
        "Партия завершилась ничьей по одному из шахматных правил.",
      result: "1/2-1/2",
      winner: "draw",
    };
  }

  return {
    isGameOver: true,
    title: "Партия завершена",
    description: "Игра больше не имеет легальных продолжений.",
    result: "*",
    winner: null,
  };
}

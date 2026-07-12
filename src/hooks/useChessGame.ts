import { useMemo, useState } from "react";
import { Chess, type Square } from "chess.js";

type UseChessGameOptions = {
  onPositionChanged?: () => void;
};

export function useChessGame({
  onPositionChanged,
}: UseChessGameOptions = {}) {
  const game = useMemo(() => new Chess(), []);

  const [position, setPosition] = useState(game.fen());
  const [history, setHistory] = useState<string[]>([]);
  const [status, setStatus] = useState("Ход белых");

  function updateStatus() {
    if (game.isCheckmate()) {
      setStatus(
        game.turn() === "w"
          ? "Мат. Победили чёрные"
          : "Мат. Победили белые",
      );
      return;
    }

    if (game.isStalemate()) {
      setStatus("Пат. Ничья");
      return;
    }

    if (game.isDraw()) {
      setStatus("Ничья");
      return;
    }

    const side = game.turn() === "w" ? "белых" : "чёрных";
    const check = game.inCheck() ? ". Шах" : "";

    setStatus(`Ход ${side}${check}`);
  }

  function syncPosition() {
    setPosition(game.fen());
    setHistory(game.history());
    updateStatus();
    onPositionChanged?.();
  }

  function onPieceDrop({
    sourceSquare,
    targetSquare,
  }: {
    sourceSquare: string;
    targetSquare: string | null;
  }) {
    if (!targetSquare) {
      return false;
    }

    try {
      const move = game.move({
        from: sourceSquare as Square,
        to: targetSquare as Square,
        promotion: "q",
      });

      if (!move) {
        return false;
      }

      syncPosition();

      return true;
    } catch {
      return false;
    }
  }

  function newGame() {
    game.reset();
    syncPosition();
  }

  function getPgn() {
    try {
      const gameWithPgn = game as unknown as {
        pgn: (options?: {
          maxWidth?: number;
          newline?: string;
        }) => string;
      };

      return gameWithPgn.pgn({
        maxWidth: 80,
        newline: "\n",
      });
    } catch {
      return game.pgn();
    }
  }

  function loadPgn(pgn: string) {
    const preparedPgn = pgn.trim();

    if (!preparedPgn) {
      return false;
    }

    try {
      const gameWithLoadPgn = game as unknown as {
        loadPgn: (pgn: string) => void | boolean;
      };

      const result = gameWithLoadPgn.loadPgn(preparedPgn);

      if (result === false) {
        return false;
      }

      syncPosition();

      return true;
    } catch {
      return false;
    }
  }

  function undoMove() {
    const move = game.undo();

    if (!move) {
      return;
    }

    syncPosition();
  }

  function makeEngineMove(uciMove: string) {
  if (!uciMove || uciMove === "(none)") {
    return false;
  }

  const from = uciMove.slice(0, 2) as Square;
  const to = uciMove.slice(2, 4) as Square;
  const promotion = uciMove.slice(4) || "q";

  try {
    const move = game.move({
      from,
      to,
      promotion,
    });

    if (!move) {
      return false;
    }

    syncPosition();

    return true;
  } catch {
    return false;
  }
}
  return {
    game,
    position,
    history,
    status,
    onPieceDrop,
    newGame,
    undoMove,
    makeEngineMove,
    getPgn,
    loadPgn,
  };
}
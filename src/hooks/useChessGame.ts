import { useMemo, useState } from "react";
import { Chess, type Square } from "chess.js";
import type { LastMoveSquares } from "../components/ChessBoard";

type UseChessGameOptions = {
  onPositionChanged?: () => void;
};

function findKingSquare(game: Chess, color: "w" | "b") {
  const board = game.board();

  for (let row = 0; row < board.length; row += 1) {
    for (let column = 0; column < board[row].length; column += 1) {
      const piece = board[row][column];

      if (piece?.type === "k" && piece.color === color) {
        const file = String.fromCharCode(97 + column);
        const rank = String(8 - row);

        return `${file}${rank}`;
      }
    }
  }

  return null;
}

function getCheckedKingSquare(game: Chess) {
  if (!game.inCheck()) {
    return null;
  }

  return findKingSquare(game, game.turn());
}

export function useChessGame({
  onPositionChanged,
}: UseChessGameOptions = {}) {
  const game = useMemo(() => new Chess(), []);

  const [position, setPosition] = useState(game.fen());
  const [history, setHistory] = useState<string[]>([]);
  const [status, setStatus] = useState("Ход белых");
  const [lastMove, setLastMove] =
    useState<LastMoveSquares | null>(null);
  const [checkSquare, setCheckSquare] =
    useState<string | null>(getCheckedKingSquare(game));

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
    setCheckSquare(getCheckedKingSquare(game));
    updateStatus();
    onPositionChanged?.();
  }

  function updateLastMoveFromHistory() {
    const verboseHistory = game.history({ verbose: true });
    const latestMove = verboseHistory.at(-1);

    if (!latestMove) {
      setLastMove(null);
      return;
    }

    setLastMove({
      from: latestMove.from,
      to: latestMove.to,
    });
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

      setLastMove({
        from: move.from,
        to: move.to,
      });

      syncPosition();

      return true;
    } catch {
      return false;
    }
  }

  function newGame() {
    game.reset();
    setLastMove(null);
    syncPosition();
  }

  function getFen() {
    return game.fen();
  }

  function loadFen(fen: string) {
    const preparedFen = fen.trim();

    if (!preparedFen) {
      return false;
    }

    try {
      game.load(preparedFen);
      setLastMove(null);
      syncPosition();

      return true;
    } catch {
      return false;
    }
  }

  function getPgn() {
    try {
      return game.pgn({
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
      game.loadPgn(preparedPgn);

      updateLastMoveFromHistory();
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

    updateLastMoveFromHistory();
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

      setLastMove({
        from: move.from,
        to: move.to,
      });

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
    lastMove,
    checkSquare,
    onPieceDrop,
    newGame,
    undoMove,
    makeEngineMove,
    getFen,
    loadFen,
    getPgn,
    loadPgn,
  };
}

import { useMemo, useState } from "react";
import { Chess, type Square } from "chess.js";
import type { LastMoveSquares } from "../components/ChessBoard";
import { readStorageValue } from "../platform/appStorage";

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

function getCheckedKingSquareFromFen(fen: string) {
  try {
    const previewGame = new Chess(fen);
    return getCheckedKingSquare(previewGame);
  } catch {
    return null;
  }
}

function getLastMoveFromVerboseHistory(
  verboseHistory: ReturnType<Chess["history"]>,
) {
  const latestMove = verboseHistory.at(-1);

  if (!latestMove || typeof latestMove === "string") {
    return null;
  }

  return {
    from: latestMove.from,
    to: latestMove.to,
  };
}

const sessionStorageKey = "chess-coach.current-pgn";

function readSavedPgn() {
  return readStorageValue(sessionStorageKey) ?? "";
}

function createInitialGame() {
  const initialGame = new Chess();
  const savedPgn = readSavedPgn().trim();

  if (!savedPgn) {
    return initialGame;
  }

  try {
    initialGame.loadPgn(savedPgn);
  } catch {
    return new Chess();
  }

  return initialGame;
}

function buildTimelineFromGame(game: Chess) {
  const pgn = game.pgn();
  const replayGame = new Chess();
  const fenHistory = [replayGame.fen()];
  const lastMoveHistory: LastMoveSquares[] = [];

  if (!pgn.trim()) {
    return { fenHistory, lastMoveHistory };
  }

  try {
    replayGame.loadPgn(pgn);
    const verboseHistory = replayGame.history({ verbose: true });

    const secondReplayGame = new Chess();

    for (const move of verboseHistory) {
      const appliedMove = secondReplayGame.move({
        from: move.from,
        to: move.to,
        promotion: move.promotion,
      });

      if (!appliedMove) {
        break;
      }

      fenHistory.push(secondReplayGame.fen());
      lastMoveHistory.push({
        from: appliedMove.from,
        to: appliedMove.to,
      });
    }
  } catch {
    return {
      fenHistory: [game.fen()],
      lastMoveHistory: [],
    };
  }

  return { fenHistory, lastMoveHistory };
}

export function useChessGame({
  onPositionChanged,
}: UseChessGameOptions = {}) {
  const game = useMemo(() => createInitialGame(), []);
  const initialTimeline = useMemo(
    () => buildTimelineFromGame(game),
    [game],
  );

  const [position, setPosition] = useState(game.fen());
  const [history, setHistory] = useState<string[]>(
    game.history(),
  );
  const [status, setStatus] = useState(() => {
    if (game.isCheckmate()) {
      return game.turn() === "w"
        ? "Мат. Победили чёрные"
        : "Мат. Победили белые";
    }

    if (game.isStalemate()) {
      return "Пат. Ничья";
    }

    if (game.isDraw()) {
      return "Ничья";
    }

    const side = game.turn() === "w" ? "белых" : "чёрных";
    const check = game.inCheck() ? ". Шах" : "";

    return `Ход ${side}${check}`;
  });
  const [lastMove, setLastMove] =
    useState<LastMoveSquares | null>(
      initialTimeline.lastMoveHistory.at(-1) ?? null,
    );
  const [checkSquare, setCheckSquare] =
    useState<string | null>(getCheckedKingSquare(game));
  const [fenHistory, setFenHistory] = useState<string[]>(
    initialTimeline.fenHistory,
  );
  const [lastMoveHistory, setLastMoveHistory] = useState<
    LastMoveSquares[]
  >(initialTimeline.lastMoveHistory);
  const [viewedMoveIndex, setViewedMoveIndex] = useState(
    Math.max(0, initialTimeline.fenHistory.length - 1),
  );

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
    const currentFen = game.fen();
    const verboseHistory = game.history({ verbose: true });
    const currentHistory = game.history();
    const currentLastMove = getLastMoveFromVerboseHistory(
      verboseHistory,
    );
    const nextFenHistory = [game.header().FEN ?? new Chess().fen()];
    const replayGame = new Chess(nextFenHistory[0]);
    const nextLastMoveHistory: LastMoveSquares[] = [];

    try {
      for (const move of verboseHistory) {
        if (typeof move === "string") {
          continue;
        }

        const appliedMove = replayGame.move({
          from: move.from,
          to: move.to,
          promotion: move.promotion,
        });

        if (!appliedMove) {
          break;
        }

        nextFenHistory.push(replayGame.fen());
        nextLastMoveHistory.push({
          from: appliedMove.from,
          to: appliedMove.to,
        });
      }
    } catch {
      nextFenHistory.splice(0, nextFenHistory.length, currentFen);
      nextLastMoveHistory.splice(0);
    }

    setPosition(currentFen);
    setHistory(currentHistory);
    setLastMove(currentLastMove);
    setCheckSquare(getCheckedKingSquare(game));
    setFenHistory(nextFenHistory);
    setLastMoveHistory(nextLastMoveHistory);
    setViewedMoveIndex(nextFenHistory.length - 1);
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
      const timeline = buildTimelineFromGame(game);

      setPosition(game.fen());
      setHistory(game.history());
      setLastMove(timeline.lastMoveHistory.at(-1) ?? null);
      setCheckSquare(getCheckedKingSquare(game));
      setFenHistory(timeline.fenHistory);
      setLastMoveHistory(timeline.lastMoveHistory);
      setViewedMoveIndex(timeline.fenHistory.length - 1);
      updateStatus();
      onPositionChanged?.();

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

  function viewMove(index: number) {
    const clampedIndex = Math.max(
      0,
      Math.min(index, fenHistory.length - 1),
    );

    setViewedMoveIndex(clampedIndex);
  }

  function viewPreviousMove() {
    viewMove(viewedMoveIndex - 1);
  }

  function viewNextMove() {
    viewMove(viewedMoveIndex + 1);
  }

  function viewCurrentMove() {
    viewMove(fenHistory.length - 1);
  }

  const displayedPosition =
    fenHistory[viewedMoveIndex] ?? position;
  const displayedLastMove =
    viewedMoveIndex > 0
      ? lastMoveHistory[viewedMoveIndex - 1] ?? null
      : null;
  const displayedCheckSquare = getCheckedKingSquareFromFen(
    displayedPosition,
  );
  const isViewingCurrentPosition =
    viewedMoveIndex === fenHistory.length - 1;

  return {
    game,
    position,
    displayedPosition,
    history,
    status,
    lastMove,
    displayedLastMove,
    checkSquare,
    displayedCheckSquare,
    fenHistory,
    viewedMoveIndex,
    isViewingCurrentPosition,
    onPieceDrop,
    newGame,
    undoMove,
    makeEngineMove,
    getFen,
    loadFen,
    getPgn,
    loadPgn,
    viewMove,
    viewPreviousMove,
    viewNextMove,
    viewCurrentMove,
  };
}

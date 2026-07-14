import type { Color } from "chess.js";
import type { GameMode } from "./gameTypes";

type GameLifecycleDependencies = {
  isBotThinking: boolean;
  gameMode: GameMode;
  newGame: () => void;
  undoMove: () => void;
  isBotTurn: () => boolean;
  loadFen: (fen: string) => boolean;
  loadPgn: (pgn: string) => boolean;
  setSelectedSquare: (square: string | null) => void;
  setIsBotThinking: (value: boolean) => void;
  setIsBotGameStarted: (value: boolean) => void;
  startBotSession: () => void;
  setLastMoveReview: (review: null) => void;
  setGameMode: (mode: GameMode) => void;
  setPlayerSide: (side: Color) => void;
  clearLearningJournal: () => void;
  clearGameReview: () => void;
  resetBestMoveTraining: () => void;
  clearAnalysis: () => void;
  clearGameTermination: () => void;
};

export function createGameLifecycleActions({
  isBotThinking,
  gameMode,
  newGame,
  undoMove,
  isBotTurn,
  loadFen,
  loadPgn,
  setSelectedSquare,
  setIsBotThinking,
  setIsBotGameStarted,
  startBotSession,
  setLastMoveReview,
  setGameMode,
  setPlayerSide,
  clearLearningJournal,
  clearGameReview,
  resetBestMoveTraining,
  clearAnalysis,
  clearGameTermination,
}: GameLifecycleDependencies) {
  function clearTransientState({
    clearJournal = false,
    clearReview = true,
  }: {
    clearJournal?: boolean;
    clearReview?: boolean;
  } = {}) {
    setIsBotThinking(false);
    setLastMoveReview(null);
    clearGameTermination();

    if (clearJournal) clearLearningJournal();
    if (clearReview) clearGameReview();

    resetBestMoveTraining();
    clearAnalysis();
  }

  function handleNewGame() {
    newGame();
    setSelectedSquare(null);
    setIsBotGameStarted(false);
    clearTransientState({ clearJournal: true });
  }

  function handleStartBotGame() {
    if (isBotThinking || gameMode !== "bot") return;

    newGame();
    setSelectedSquare(null);
    startBotSession();
    clearTransientState({ clearJournal: true });
  }

  function handleUndoMove() {
    if (isBotThinking) return;

    setSelectedSquare(null);
    undoMove();

    if (gameMode === "analysis") {
      clearTransientState({ clearReview: false });
      return;
    }

    if (isBotTurn()) undoMove();
    clearTransientState();
  }

  function handleModeChange(mode: GameMode) {
    if (isBotThinking) return;

    setSelectedSquare(null);
    setGameMode(mode);
    setIsBotGameStarted(false);
    clearTransientState();
  }

  function handlePlayerSideChange(side: Color) {
    if (isBotThinking) return;

    setSelectedSquare(null);
    setPlayerSide(side);
    setIsBotGameStarted(false);
    clearTransientState();
    newGame();
  }

  function importPosition(
    value: string,
    load: (preparedValue: string) => boolean,
  ) {
    if (isBotThinking) return false;

    setSelectedSquare(null);

    if (!load(value)) return false;

    setGameMode("analysis");
    setIsBotGameStarted(false);
    clearTransientState({ clearJournal: true });
    return true;
  }

  return {
    handleNewGame,
    handleStartBotGame,
    handleUndoMove,
    handleModeChange,
    handlePlayerSideChange,
    handleImportFen: (fen: string) => importPosition(fen, loadFen),
    handleImportPgn: (pgn: string) => importPosition(pgn, loadPgn),
  };
}

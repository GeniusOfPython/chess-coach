import { useEffect, useRef, useState } from "react";
import type { Chess, Color } from "chess.js";
import type { RewardToastMessage } from "../components/RewardToast";
import type { WorkspaceId } from "../components/WorkspaceTabs";
import { detectChessAchievements } from "../features/chessAchievements";
import {
  createArchivedGame,
  type ArchivedGame,
} from "../game/gameArchive";
import {
  getGameResultInfo,
  getTerminatedGameResultInfo,
} from "../game/gameResult";
import type { BotGameTermination, GameMode } from "../game/gameTypes";
import { useChessAchievements } from "../hooks/useChessAchievements";
import { useGameArchive } from "../hooks/useGameArchive";
import { triggerSuccessHaptic } from "../platform/nativeBridge";
import type { BotLevelId } from "../types/bot";

type UseMatchLifecycleOptions = {
  game: Chess;
  gameMode: GameMode;
  playerSide: Color;
  botLevelId: BotLevelId;
  historyLength: number;
  position: string;
  isViewingCurrentPosition: boolean;
  gameTermination: BotGameTermination | null;
  getPgn: () => string;
  importPgn: (pgn: string) => boolean;
  startNewGame: () => void;
  setActiveWorkspace: (workspace: WorkspaceId | null) => void;
  showRewardToast: (message: Omit<RewardToastMessage, "id">) => void;
};

export function useMatchLifecycle({
  game,
  gameMode,
  playerSide,
  botLevelId,
  historyLength,
  position,
  isViewingCurrentPosition,
  gameTermination,
  getPgn,
  importPgn,
  startNewGame,
  setActiveWorkspace,
  showRewardToast,
}: UseMatchLifecycleOptions) {
  const {
    games: archivedGames,
    addGame: addArchivedGame,
    removeGame: removeArchivedGame,
    clearGames: clearArchivedGames,
  } = useGameArchive();
  const {
    unlocked: unlockedAchievements,
    unlock: unlockAchievements,
  } = useChessAchievements();
  const archivedPositionRef = useRef<string | null>(null);
  const achievementPositionRef = useRef<string | null>(null);
  const celebratedResultRef = useRef<string | null>(null);
  const [showResultCelebration, setShowResultCelebration] = useState(false);

  const isMatchFinished = game.isGameOver() || gameTermination !== null;
  const finalResultInfo = isMatchFinished
    ? gameTermination
      ? getTerminatedGameResultInfo(gameTermination)
      : getGameResultInfo(game)
    : null;
  const showInitialBoard = isMatchFinished && isViewingCurrentPosition;

  useEffect(() => {
    if (!isMatchFinished || historyLength === 0) {
      archivedPositionRef.current = null;
      return;
    }

    const pgn = getPgn();

    if (!pgn || archivedPositionRef.current === pgn) {
      return;
    }

    const resultInfo = gameTermination
      ? getTerminatedGameResultInfo(gameTermination)
      : getGameResultInfo(game);
    archivedPositionRef.current = pgn;
    addArchivedGame(createArchivedGame({
      pgn,
      mode: gameMode,
      playerSide,
      botLevelId,
      result: resultInfo.result,
      winner: resultInfo.winner,
      halfMoves: historyLength,
    }));
  }, [
    addArchivedGame,
    botLevelId,
    game,
    gameTermination,
    gameMode,
    getPgn,
    historyLength,
    isMatchFinished,
    playerSide,
    position,
  ]);

  useEffect(() => {
    if (!isMatchFinished || historyLength === 0) {
      achievementPositionRef.current = null;
      return;
    }

    const pgn = getPgn();

    if (!pgn || achievementPositionRef.current === pgn) {
      return;
    }

    achievementPositionRef.current = pgn;
    const newlyUnlocked = unlockAchievements(detectChessAchievements({
      game,
      mode: gameMode,
      playerSide,
    }));
    const firstAchievement = newlyUnlocked[0];

    if (firstAchievement) {
      showRewardToast({
        kind: "success",
        title: `Достижение: ${firstAchievement.title}`,
        text: firstAchievement.description,
      });
      void triggerSuccessHaptic();
    }
  }, [
    game,
    gameMode,
    getPgn,
    historyLength,
    isMatchFinished,
    playerSide,
    position,
    showRewardToast,
    unlockAchievements,
  ]);

  useEffect(() => {
    if (!isMatchFinished || historyLength === 0) {
      celebratedResultRef.current = null;
      setShowResultCelebration(false);
      return;
    }

    const pgn = getPgn();
    const resultKey = `${pgn}|${gameTermination?.result ?? "natural"}`;

    if (!pgn || celebratedResultRef.current === resultKey) {
      return;
    }

    celebratedResultRef.current = resultKey;
    setShowResultCelebration(true);
  }, [gameTermination, getPgn, historyLength, isMatchFinished]);

  function openArchivedGame(archivedGame: ArchivedGame) {
    archivedPositionRef.current = archivedGame.pgn;

    if (importPgn(archivedGame.pgn)) {
      setActiveWorkspace("game");
    }
  }

  function openResultReview() {
    setShowResultCelebration(false);
    setActiveWorkspace("game");
  }

  function startNewGameFromResult() {
    setShowResultCelebration(false);
    startNewGame();
  }

  return {
    archive: {
      games: archivedGames,
      remove: removeArchivedGame,
      clear: clearArchivedGames,
      open: openArchivedGame,
    },
    achievements: {
      unlocked: unlockedAchievements,
    },
    result: {
      isMatchFinished,
      finalResultInfo,
      showInitialBoard,
      celebrationVisible: showResultCelebration,
      closeCelebration: () => setShowResultCelebration(false),
      openReview: openResultReview,
      startNewGame: startNewGameFromResult,
    },
  };
}

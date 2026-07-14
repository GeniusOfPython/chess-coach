import type { Chess } from "chess.js";
import { getGameResultInfo } from "../game/gameResult";
import type { GameResultInfo } from "../game/gameResult";

type Props = {
  game: Chess;
  historyLength: number;
  onNewGame: () => void;
  overrideResult?: GameResultInfo | null;
};

export default function GameResultPanel({
  game,
  historyLength,
  onNewGame,
  overrideResult = null,
}: Props) {
  const resultInfo = overrideResult ?? getGameResultInfo(game);

  return (
    <div className="game-result-card">
      <span className="status-label">Итог партии</span>

      <div
        className={
          resultInfo.isGameOver
            ? `game-result finished ${resultInfo.winner ?? ""}`
            : "game-result"
        }
      >
        <div className="game-result-header">
          <strong>{resultInfo.title}</strong>
          <span>{resultInfo.result}</span>
        </div>

        <p>{resultInfo.description}</p>

        <div className="game-result-meta">
          <span>Сделано ходов</span>
          <b>{historyLength}</b>
        </div>

        {resultInfo.isGameOver && (
          <button
            type="button"
            className="game-result-button"
            onClick={onNewGame}
          >
            Начать новую партию
          </button>
        )}
      </div>
    </div>
  );
}

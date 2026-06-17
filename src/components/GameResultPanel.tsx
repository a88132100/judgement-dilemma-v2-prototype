import { WIN_AT_JUDGMENT_POINTS } from '../game/constants';
import { playerName } from '../game/log';
import type { GameState } from '../game/types';

interface GameResultPanelProps {
  gameState: GameState;
  onRestart: () => void;
}

const reasonLabels: Record<NonNullable<GameState['gameOverReason']>, string> = {
  judgmentWin: `達到 ${WIN_AT_JUDGMENT_POINTS} 點`,
  allButOneEliminated: '只剩一人',
  maxRounds: '回合上限',
  allEliminatedTieBreak: '全員同時出局後最高分判定'
};

export function GameResultPanel({ gameState, onRestart }: GameResultPanelProps) {
  if (!gameState.gameOverReason || !gameState.winnerPlayerIds?.length) {
    return null;
  }

  const winnerNames = gameState.winnerPlayerIds.map((playerId) => playerName(gameState.players, playerId));
  const ranking = [...gameState.players].sort((left, right) => {
    if (right.judgmentPoints !== left.judgmentPoints) {
      return right.judgmentPoints - left.judgmentPoints;
    }
    return left.name.localeCompare(right.name, 'zh-Hant');
  });

  return (
    <section className="panel game-result-panel" aria-live="polite">
      <div className="result-hero">
        <div>
          <span className="eyebrow">Game Over</span>
          <h2>{gameState.isTie ? '並列勝利' : '勝者出爐'}</h2>
          <p className="result-winner">{winnerNames.join('、')}</p>
        </div>
        <button className="confirm-button" type="button" onClick={onRestart}>
          重新開始
        </button>
      </div>

      <div className="result-meta-grid">
        <span>結束原因：{reasonLabels[gameState.gameOverReason]}</span>
        <span>{gameState.isTie ? '本局為並列勝利。' : '本局為單一勝者。'}</span>
      </div>

      <div className="ranking-list" aria-label="最終排名">
        {ranking.map((player, index) => (
          <div className="ranking-row" key={player.id}>
            <span className="rank-number">#{index + 1}</span>
            <strong>{player.name}</strong>
            <span>{player.judgmentPoints} 裁決點</span>
            {gameState.winnerPlayerIds?.includes(player.id) ? <span className="tag">勝者</span> : null}
          </div>
        ))}
      </div>
    </section>
  );
}

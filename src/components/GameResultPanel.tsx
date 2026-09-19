import { WIN_AT_JUDGMENT_POINTS } from '../game/constants';
import { playerName } from '../game/log';
import type { GameState } from '../game/types';
import { useDialogFocus } from './useDialogFocus';
import { TribunalPlaque } from './TribunalPlaque';

interface GameResultPanelProps {
  gameState: GameState;
  onRestart: () => void;
  onBackToTitle?: () => void;
}

const reasonLabels: Record<NonNullable<GameState['gameOverReason']>, string> = {
  judgmentWin: `達到 ${WIN_AT_JUDGMENT_POINTS} 點`,
  allButOneEliminated: '只剩一人',
  maxRounds: '回合上限',
  allEliminatedTieBreak: '全員同時出局後最高分判定'
};

export function GameResultPanel({ gameState, onRestart, onBackToTitle }: GameResultPanelProps) {
  const isOpen = Boolean(gameState.gameOverReason && gameState.winnerPlayerIds?.length);
  const dialogRef = useDialogFocus(isOpen);
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
    <div className="tribunal-result-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) event.preventDefault();
    }}>
    <section ref={dialogRef} tabIndex={-1} className="panel game-result-panel tribunal-result" role="dialog" aria-modal="true" aria-label="審判終局" aria-live="polite">
      <div className="result-hero tribunal-result-hero">
        <div className="tribunal-result-heading">
          <TribunalPlaque>
            <span className="tribunal-plaque-kicker">審判終局</span>
            <h2 className="tribunal-plaque-title">{gameState.isTie ? '並列勝利' : '勝者出爐'}</h2>
          </TribunalPlaque>
          <p className="result-winner">{winnerNames.join('、')}</p>
        </div>
        <div className="tribunal-result-actions">
          <button className="confirm-button" type="button" onClick={onRestart}>
            重新開始
          </button>
          {onBackToTitle ? <button className="secondary-button" type="button" onClick={onBackToTitle}>回到主畫面</button> : null}
        </div>
      </div>

      <div className="result-meta-grid tribunal-result-meta">
        <span>結束原因：{reasonLabels[gameState.gameOverReason]}</span>
        <span>{gameState.isTie ? '本局為並列勝利。' : '本局為單一勝者。'}</span>
      </div>

      <div className="ranking-list tribunal-result-ranking" aria-label="最終排名">
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
    </div>
  );
}

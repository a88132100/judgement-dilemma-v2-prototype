import { PHASE_LABELS } from '../game/constants';
import { playerName } from '../game/log';
import type { GameState } from '../game/types';
import { commitmentTokenImageByFaction } from './assetMap';

interface PhasePanelProps {
  gameState: GameState;
}

export function PhasePanel({ gameState }: PhasePanelProps) {
  const winner = gameState.winnerPlayerId ? playerName(gameState.players, gameState.winnerPlayerId) : undefined;

  return (
    <section className="phase-panel">
      <div>
        <span className="eyebrow">第 {gameState.round} 回合</span>
        <h2>{PHASE_LABELS[gameState.phase]}</h2>
      </div>
      <div className="phase-meta">
        <span>莊家：{playerName(gameState.players, gameState.dealerPlayerId)}</span>
        <span>勝利：11 點</span>
        <span>出局：0 點</span>
        {gameState.phase === 'commitment' ? (
          <span className="phase-token-strip">
            <img className="asset-thumb token-thumb" src={commitmentTokenImageByFaction.alliance} alt="" onError={(event) => event.currentTarget.remove()} />
            <img className="asset-thumb token-thumb" src={commitmentTokenImageByFaction.betrayal} alt="" onError={(event) => event.currentTarget.remove()} />
          </span>
        ) : null}
        {winner ? <strong>勝者：{winner}</strong> : null}
      </div>
    </section>
  );
}

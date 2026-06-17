import { CARD_LABELS } from '../game/constants';
import type { PlayerState } from '../game/types';
import { cardImageByType } from './assetMap';

interface HandPanelProps {
  player: PlayerState;
}

export function HandPanel({ player }: HandPanelProps) {
  return (
    <section className="panel hand-panel">
      <h2>你的手牌</h2>
      <div className="hand-list">
        {player.hand.length === 0 ? <span className="muted">沒有手牌</span> : null}
        {player.hand.map((card, index) => (
          <span className="hand-card game-card-mini" key={`${card}-${index}`}>
            <img className="asset-thumb card-thumb" src={cardImageByType[card]} alt="" onError={(event) => event.currentTarget.remove()} />
            {CARD_LABELS[card]}
          </span>
        ))}
      </div>
    </section>
  );
}

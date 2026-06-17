import { CARD_LABELS, FACTION_LABELS } from '../game/constants';
import type { CardType, Faction, PlayerState, RoundPhase } from '../game/types';
import { cardBackImage, cardImageByType, commitmentTokenImageByFaction, factionCardImageByFaction } from './assetMap';

interface PlayerPanelProps {
  player: PlayerState;
  dealerPlayerId: string;
  phase: RoundPhase;
}

const revealPhases = new Set<RoundPhase>(['reveal', 'resolveJudgment', 'drawCards', 'roundEnd', 'gameEnd']);

function slotImage(src: string, label: string, className = '') {
  return (
    <span className={`seat-slot-value ${className}`}>
      <img src={src} alt="" onError={(event) => event.currentTarget.remove()} />
      <span>{label}</span>
    </span>
  );
}

function factionSlot(faction: Faction, showReveal: boolean) {
  return showReveal ? slotImage(factionCardImageByFaction[faction], FACTION_LABELS[faction]) : slotImage(cardBackImage, '已暗放', 'is-hidden');
}

function cardSlot(card: CardType, showReveal: boolean) {
  return showReveal ? slotImage(cardImageByType[card], CARD_LABELS[card]) : slotImage(cardBackImage, '已暗放', 'is-hidden');
}

export function PlayerPanel({ player, dealerPlayerId, phase }: PlayerPanelProps) {
  const showReveal = revealPhases.has(phase);
  const personalityLabel = player.isHuman
    ? '你'
    : player.botPersonality === 'honest'
      ? '守信型'
      : player.botPersonality === 'opportunist'
        ? '投機型'
        : '觀望型';

  return (
    <article className={`player-card seat-card ${player.isEliminated ? 'is-eliminated' : ''}`}>
      <div className="player-title">
        <h3>{player.name}</h3>
        {dealerPlayerId === player.id ? <span className="tag">莊家</span> : null}
      </div>
      <p className="points">{player.judgmentPoints} 裁決點</p>
      <span className="seat-personality">{personalityLabel}</span>

      <div className="seat-slot-grid">
        <div className="seat-slot">
          <span>承諾</span>
          {player.commitment
            ? player.isHuman
              ? slotImage(commitmentTokenImageByFaction[player.commitment], FACTION_LABELS[player.commitment], 'is-token')
              : slotImage(cardBackImage, '已承諾', 'is-hidden')
            : '未承諾'}
        </div>
        <div className="seat-slot">
          <span>陣營</span>
          {player.chosenFaction ? factionSlot(player.chosenFaction, showReveal) : '未暗放'}
        </div>
        <div className="seat-slot">
          <span>功能牌</span>
          {player.playedCard ? cardSlot(player.playedCard.type, showReveal || player.playedCard.isPublic) : player.chosenFaction ? '未使用' : '未暗放'}
        </div>
      </div>
    </article>
  );
}

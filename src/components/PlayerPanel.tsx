import { CARD_LABELS, WIN_AT_JUDGMENT_POINTS } from '../game/constants';
import type { CardType, Faction, PlayerState, RoundPhase } from '../game/types';
import { cardBackImage, cardImageByType, commitmentTokenImageByFaction, factionCardImageByFaction } from './assetMap';

interface PlayerPanelProps {
  player: PlayerState;
  dealerPlayerId: string;
  phase: RoundPhase;
  seatPosition?: 'top' | 'left' | 'right' | 'bottom';
}

const revealPhases = new Set<RoundPhase>(['reveal', 'resolveJudgment', 'drawCards', 'roundEnd', 'gameEnd']);

const factionLabels: Record<Faction, string> = {
  alliance: '盟約',
  betrayal: '叛離'
};

const personalityLabels = {
  honest: '守信型',
  opportunist: '投機型',
  observer: '觀望型'
} as const;

function slotImage(src: string, label: string, className = '') {
  return (
    <span className={`seat-slot-value ${className}`}>
      <img src={src} alt="" onError={(event) => event.currentTarget.remove()} />
      <span>{label}</span>
    </span>
  );
}

function factionSlot(faction: Faction, shouldReveal: boolean) {
  return shouldReveal ? slotImage(factionCardImageByFaction[faction], factionLabels[faction]) : slotImage(cardBackImage, '暗放', 'is-hidden');
}

function cardSlot(card: CardType, shouldReveal: boolean) {
  return shouldReveal ? slotImage(cardImageByType[card], CARD_LABELS[card]) : slotImage(cardBackImage, '伏置', 'is-hidden');
}

export function PlayerPanel({ player, dealerPlayerId, phase, seatPosition = 'top' }: PlayerPanelProps) {
  const showReveal = revealPhases.has(phase);
  const canSeeOwnHidden = player.isHuman;
  const shouldRevealHidden = showReveal || canSeeOwnHidden;
  const pointsToWin = Math.max(0, WIN_AT_JUDGMENT_POINTS - player.judgmentPoints);
  const personalityLabel = player.isHuman ? '你' : personalityLabels[player.botPersonality ?? 'observer'];
  const playStatus = player.chosenFaction ? '已暗放陣營' : '等待出牌';
  const functionStatus = player.playedCard ? `功能牌：${showReveal || player.playedCard.isPublic || player.isHuman ? CARD_LABELS[player.playedCard.type] : '已伏置'}` : '功能牌：未使用';

  return (
    <article className={`player-card seat-card seat-${seatPosition} ${player.isEliminated ? 'is-eliminated' : ''}`}>
      <div className="player-title">
        <div>
          <span className="seat-personality">{personalityLabel}</span>
          <h3>{player.name}</h3>
        </div>
        {dealerPlayerId === player.id ? <span className="tag">莊家</span> : null}
      </div>

      <div className="seat-score-row">
        <span>裁決點</span>
        <strong>{player.judgmentPoints}</strong>
      </div>
      <p className={`win-distance ${pointsToWin <= 2 && !player.isEliminated ? 'is-close' : ''}`}>
        {player.isEliminated ? '已出局' : pointsToWin === 0 ? '已達勝利門檻' : `距離勝利還差 ${pointsToWin} 點`}
      </p>

      <div className="seat-status-strip">
        <span>{player.commitment ? `承諾：${factionLabels[player.commitment]}` : '尚未承諾'}</span>
        <span>{playStatus}</span>
        <span>{functionStatus}</span>
      </div>

      <div className="seat-slot-grid" aria-label={`${player.name} 本回合狀態`}>
        <div className="seat-slot">
          <span>承諾</span>
          {player.commitment ? slotImage(commitmentTokenImageByFaction[player.commitment], factionLabels[player.commitment], 'is-token') : <span className="muted">待放置</span>}
        </div>
        <div className="seat-slot">
          <span>陣營</span>
          {player.chosenFaction ? factionSlot(player.chosenFaction, shouldRevealHidden) : <span className="muted">未出牌</span>}
        </div>
        <div className="seat-slot">
          <span>功能牌</span>
          {player.playedCard ? cardSlot(player.playedCard.type, showReveal || player.playedCard.isPublic || player.isHuman) : <span className="muted">未使用</span>}
        </div>
      </div>
    </article>
  );
}

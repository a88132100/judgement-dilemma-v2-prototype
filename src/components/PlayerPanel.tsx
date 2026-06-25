import { CARD_LABELS, WIN_AT_JUDGMENT_POINTS } from '../game/constants';
import { DEFAULT_OPPONENTS } from '../game/opponents';
import type { CardType, Faction, FunctionCardSelection, PlayerState, RoundPhase } from '../game/types';
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

function statusBadge(label: string, value: string, imageSrc?: string, className = '') {
  return (
    <span className={`seat-status-badge ${className}`}>
      {imageSrc ? <img src={imageSrc} alt="" onError={(event) => event.currentTarget.remove()} /> : <span className="seat-status-dot" />}
      <span className="seat-status-label">{label}</span>
      <strong>{value}</strong>
    </span>
  );
}

function avatarForPlayer(player: PlayerState): string | undefined {
  if (player.isHuman || !player.botPersonality) {
    return undefined;
  }
  return DEFAULT_OPPONENTS.find((opponent) => opponent.personality === player.botPersonality)?.avatar;
}

function cardTypeSelection(selection: FunctionCardSelection | undefined): CardType | undefined {
  return selection && selection !== 'blank' ? selection : undefined;
}

export function PlayerPanel({ player, dealerPlayerId, phase, seatPosition = 'top' }: PlayerPanelProps) {
  const showReveal = revealPhases.has(phase);
  const showPublicFunction = phase === 'resolvePublicCards' && Boolean(player.playedCard?.isPublic);
  const canSeeOwnHidden = player.isHuman;
  const shouldRevealHidden = showReveal || canSeeOwnHidden;
  const pointsToWin = Math.max(0, WIN_AT_JUDGMENT_POINTS - player.judgmentPoints);
  const personalityLabel = player.isHuman ? '你' : personalityLabels[player.botPersonality ?? 'observer'];
  const commitmentLabel = player.commitment ? factionLabels[player.commitment] : '未承諾';
  const commitmentImage = player.commitment ? commitmentTokenImageByFaction[player.commitment] : undefined;
  const factionLabel = player.chosenFaction ? (shouldRevealHidden ? factionLabels[player.chosenFaction] : '已暗放') : '未出牌';
  const factionImage = player.chosenFaction ? (shouldRevealHidden ? factionCardImageByFaction[player.chosenFaction] : cardBackImage) : undefined;
  const functionSelection = player.functionCardSelection ?? player.playedCard?.type ?? (player.chosenFaction ? 'blank' : undefined);
  const visibleFunctionType = cardTypeSelection(functionSelection);
  const shouldRevealFunction = showReveal || showPublicFunction || canSeeOwnHidden;
  const functionLabel = functionSelection
    ? shouldRevealFunction
      ? functionSelection === 'blank'
        ? '空白密令'
        : CARD_LABELS[functionSelection]
      : '已暗放'
    : '未暗放';
  const functionImage = functionSelection
    ? shouldRevealFunction && visibleFunctionType
      ? cardImageByType[visibleFunctionType]
      : cardBackImage
    : undefined;
  const avatar = avatarForPlayer(player);
  const avatarFallback = player.isHuman ? '你' : player.name.slice(0, 2);

  return (
    <article className={`player-card seat-card seat-${seatPosition} ${player.isEliminated ? 'is-eliminated' : ''}`}>
      <div className="player-title">
        <div className="seat-avatar">
          <span className="avatar-fallback">{avatarFallback}</span>
          {avatar ? <img src={avatar} alt="" onError={(event) => event.currentTarget.remove()} /> : null}
        </div>
        <div>
          <span className="seat-personality">{personalityLabel}</span>
          <h3>{player.name}</h3>
        </div>
        {dealerPlayerId === player.id ? <span className="tag">莊家</span> : null}
      </div>

      <div className="seat-score-row">
        <span>裁決</span>
        <strong>{player.judgmentPoints}</strong>
      </div>
      <p className={`win-distance ${pointsToWin <= 2 && !player.isEliminated ? 'is-close' : ''}`}>
        {player.isEliminated ? '已出局' : pointsToWin === 0 ? '已達勝利門檻' : `距離勝利還差 ${pointsToWin} 點`}
      </p>

      <div className="seat-status-badges" aria-label={`${player.name} 本回合狀態`}>
        {statusBadge('承諾', commitmentLabel, commitmentImage, player.commitment ? 'has-token' : '')}
        {statusBadge('陣營', factionLabel, factionImage, player.chosenFaction ? 'has-card' : '')}
        {statusBadge('功能', functionLabel, functionImage, functionSelection ? 'has-card' : '')}
      </div>
    </article>
  );
}

import { WIN_AT_JUDGMENT_POINTS } from '../game/constants';
import { getSpeechPersonality } from '../game/botSpeech';
import type { Faction, PlayerState, RoundPhase } from '../game/types';
import { seatedCharacterForPlayer } from './seatedCharacterAssets';

interface PlayerPanelProps {
  player: PlayerState;
  dealerPlayerId: string;
  phase: RoundPhase;
  seatPosition?: 'top' | 'left' | 'right' | 'bottom';
  visualStyle?: 'classic' | 'alpha';
  // 保留既有呼叫介面；所有桌牌統一由牌桌物件層呈現。
  showTableCards?: boolean;
}

const revealPhases = new Set<RoundPhase>(['reveal', 'resolveJudgment', 'drawCards', 'roundEnd', 'gameEnd']);
const factionLabels: Record<Faction, string> = { alliance: '盟約', betrayal: '叛離' };
const personalityLabels = { honest: '守信型', opportunist: '投機型', observer: '觀望型' } as const;

export function PlayerPanel({ player, dealerPlayerId, phase, seatPosition = 'top', visualStyle = 'classic' }: PlayerPanelProps) {
  const showReveal = revealPhases.has(phase) || player.isHuman;
  const pointsToWin = Math.max(0, WIN_AT_JUDGMENT_POINTS - player.judgmentPoints);
  const characterImage = seatedCharacterForPlayer(player);
  const personality = player.isHuman ? '玩家' : personalityLabels[getSpeechPersonality(player)];
  const commitmentLabel = player.commitment ? `公開承諾${factionLabels[player.commitment]}` : '尚未承諾';
  const readiness = player.isEliminated ? '已出局'
    : player.chosenFaction ? showReveal ? `揭示${factionLabels[player.chosenFaction]}` : '暗牌已落桌'
    : player.commitment ? '等待落牌' : '等待承諾';

  return (
    <article className={`player-card seat-card tribunal-opponent-seat seated-player seat-${seatPosition} ${player.isEliminated ? 'is-eliminated' : ''} ${pointsToWin <= 2 && !player.isEliminated ? 'is-close-to-victory' : ''}`}
      data-visual-style={visualStyle} aria-label={`${player.name}，${player.judgmentPoints} 裁決點，${commitmentLabel}${player.isEliminated ? '，已出局' : ''}`}>
      <div className="seated-character-stage" aria-hidden="true">
        {characterImage ? (
          <img className="seated-character-art" src={characterImage} alt="" draggable={false} />
        ) : <span className="seated-character-fallback">{player.isHuman ? '你' : player.name.slice(0, 2)}</span>}
      </div>
      <div className="seated-player-plaque">
        <div className="seat-nameplate">
          <h3>{player.name}</h3>
          <span className="seat-personality">{personality}</span>
        </div>
        <div className="seat-score-row" title={pointsToWin === 0 ? '已達勝利門檻' : `距離勝利還差 ${pointsToWin} 點`}>
          <strong>{player.judgmentPoints}</strong><span>裁決點</span>
        </div>
        {dealerPlayerId === player.id ? <span className="seat-dealer-mark" title="本回合莊家">莊</span> : null}
        <span className="seat-card-readiness">{readiness}</span>
      </div>
      {player.isEliminated ? <span className="seat-eliminated-mark">已出局</span> : null}
    </article>
  );
}

import { CARD_LABELS } from '../game/constants';
import type { FunctionCardSelection, PlayerState, RoundPhase } from '../game/types';
import { cardBackImage, cardImageByType, factionCardImageByFaction } from './assetMap';
import { CommitmentTokenArt } from './CommitmentTokenArt';

interface TableSeatSlotsProps {
  players: PlayerState[];
  phase: RoundPhase;
}

const revealPhases = new Set<RoundPhase>(['reveal', 'resolveJudgment', 'drawCards', 'roundEnd', 'gameEnd']);
const seatPositions = ['top', 'left', 'right'] as const;

function functionCardLabel(selection: FunctionCardSelection, shouldReveal: boolean): string {
  if (!shouldReveal) return '暗放';
  return selection === 'blank' ? '未使用功能牌' : CARD_LABELS[selection];
}

export function TableSeatSlots({ players, phase }: TableSeatSlotsProps) {
  const shouldRevealHidden = revealPhases.has(phase);

  return (
    <div className="tribunal-seat-card-layer">
      {players.slice(0, 3).map((player, index) => {
        const functionSelection = player.functionCardSelection ?? player.playedCard?.type ?? (player.chosenFaction ? 'blank' : undefined);
        const shouldRevealFunction = shouldRevealHidden || (phase === 'resolvePublicCards' && Boolean(player.playedCard?.isPublic));
        const factionImage = player.chosenFaction && shouldRevealHidden ? factionCardImageByFaction[player.chosenFaction] : cardBackImage;
        const functionImage = functionSelection && functionSelection !== 'blank' && shouldRevealFunction ? cardImageByType[functionSelection] : cardBackImage;
        // 空白密令在揭示前仍以相同卡背保密，揭示後撤去，不留下假卡或空槽。
        const showFunctionCard = Boolean(functionSelection && (functionSelection !== 'blank' || !shouldRevealFunction));
        if (!player.commitment && !player.chosenFaction && !showFunctionCard) return null;

        return (
          <div className={`tribunal-seat-card-stack seat-stack-${seatPositions[index]} ${player.isEliminated ? 'is-eliminated' : ''}`}
            key={player.id} role="group" aria-label={`${player.name}的桌上物件`}>
            {player.commitment ? (
              <span className={`table-commitment-token commitment-${player.commitment}`} title={`公開承諾${player.commitment === 'alliance' ? '盟約' : '叛離'}`}>
                <CommitmentTokenArt faction={player.commitment} label={`承諾${player.commitment === 'alliance' ? '盟約' : '叛離'}`} />
                <small>{player.commitment === 'alliance' ? '盟約' : '叛離'}</small>
              </span>
            ) : null}
            {player.chosenFaction ? (
              <span className={`tribunal-table-card table-faction-card has-card ${shouldRevealHidden ? `is-revealed faction-${player.chosenFaction}` : 'is-face-down'}`}>
                <img src={factionImage} alt="" draggable={false} />
                <small>{shouldRevealHidden ? player.chosenFaction === 'alliance' ? '盟約' : '叛離' : '暗放'}</small>
              </span>
            ) : null}
            {showFunctionCard && functionSelection ? (
              <span className={`tribunal-table-card table-function-card has-card ${shouldRevealFunction ? 'is-revealed' : 'is-face-down'}`}>
                <img src={functionImage} alt="" draggable={false} />
                <small>{functionCardLabel(functionSelection, shouldRevealFunction)}</small>
              </span>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

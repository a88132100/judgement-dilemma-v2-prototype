import { CARD_LABELS } from '../game/constants';
import type { GameState, RoundResult } from '../game/types';
import { cardImageByType } from './assetMap';

interface RoundCardReportProps {
  gameState: GameState;
  result: RoundResult;
}

export function RoundCardReport({ gameState, result }: RoundCardReportProps) {
  const entries = result.cardReport ?? [];
  const playerName = (id: string) => gameState.players.find((player) => player.id === id)?.name ?? '玩家';
  const hasPlayedCards = gameState.players.some((player) => result.situation.validPlayerIds.includes(player.id) && player.playedCard);

  return (
    <div className="round-card-report" aria-label="本回合功能牌處理結果">
      {entries.length ? (
        <ol className="round-card-report-list">
          {entries.map((entry, index) => (
            <li className={`round-card-report-entry ${gameState.players.find((player) => player.id === entry.playerId)?.isHuman ? 'is-human' : ''}`}
              key={`${entry.playerId}-${entry.cardType}`} data-card-type={entry.cardType} data-player-id={entry.playerId}>
              <div className="round-card-report-art" aria-hidden="true">
                <img src={cardImageByType[entry.cardType]} alt="" draggable={false} />
                <span>{String(index + 1).padStart(2, '0')}</span>
              </div>
              <div className="round-card-report-copy">
                <div className="round-card-report-owner">
                  <span>{playerName(entry.playerId)}</span>
                  {entry.targetPlayerId ? <><span aria-hidden="true">→</span><span>{playerName(entry.targetPlayerId)}</span></> : null}
                </div>
                <h3>{CARD_LABELS[entry.cardType]}</h3>
                <p>{entry.summary}</p>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <div className="round-card-report-empty">
          <span aria-hidden="true">◇</span>
          <h3>{hasPlayedCards ? '功能牌處理完畢' : '本回合無人使用功能牌'}</h3>
          <p>{hasPlayedCards ? '接著查看本回合的裁決明細。' : '所有陣營已揭示，接著查看裁決結果。'}</p>
        </div>
      )}
    </div>
  );
}

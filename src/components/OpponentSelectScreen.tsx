import { useState, type CSSProperties } from 'react';
import { DEFAULT_OPPONENTS, DEFAULT_SELECTED_OPPONENTS, type OpponentMetadata } from '../game/opponents';
import type { BotPersonality } from '../game/types';
import { backgroundImages } from './assetMap';

interface OpponentSelectScreenProps {
  opponents?: OpponentMetadata[];
  initialSelectedOpponents?: OpponentMetadata[];
  onBack: () => void;
  onStart: (opponents: OpponentMetadata[]) => void;
}

const personalityLabels: Record<BotPersonality, string> = {
  honest: '守信型',
  opportunist: '投機型',
  observer: '觀望型'
};

function profileFallbackText(opponent: OpponentMetadata): string {
  return opponent.name.slice(0, 2);
}

const requiredOpponentCount = 3;

export function OpponentSelectScreen({
  opponents = DEFAULT_OPPONENTS,
  initialSelectedOpponents = DEFAULT_SELECTED_OPPONENTS,
  onBack,
  onStart
}: OpponentSelectScreenProps) {
  const screenStyle = { '--trial-room-bg': `url(${backgroundImages.trialRoom})` } as CSSProperties;
  const [selectedOpponentIds, setSelectedOpponentIds] = useState<string[]>(() =>
    initialSelectedOpponents.slice(0, requiredOpponentCount).map((opponent) => opponent.id)
  );
  const selectedOpponents = selectedOpponentIds
    .map((opponentId) => opponents.find((opponent) => opponent.id === opponentId))
    .filter((opponent): opponent is OpponentMetadata => Boolean(opponent));
  const canStart = selectedOpponents.length === requiredOpponentCount;

  function toggleOpponent(opponentId: string) {
    setSelectedOpponentIds((current) => {
      if (current.includes(opponentId)) {
        return current.filter((selectedId) => selectedId !== opponentId);
      }
      if (current.length >= requiredOpponentCount) {
        return current;
      }
      return [...current, opponentId];
    });
  }

  return (
    <main className="entry-shell opponent-select-screen" style={screenStyle}>
      <section className="opponent-select-panel">
        <div className="entry-panel-heading">
          <div>
            <span className="eyebrow">Opponent Select</span>
            <h1>選擇對手</h1>
            <p>從 6 名審判者中選擇 3 名對手。每名角色保留原人格基底，但擁有不同決策傾向。</p>
            <p className="opponent-select-count">已選 {selectedOpponents.length} / {requiredOpponentCount}</p>
          </div>
          <button className="secondary-button" type="button" onClick={onBack}>
            回到主畫面
          </button>
        </div>

        <div className="opponent-card-grid" aria-label="可選對手">
          {opponents.map((opponent) => {
            const isSelected = selectedOpponentIds.includes(opponent.id);
            const isDisabled = !isSelected && selectedOpponentIds.length >= requiredOpponentCount;
            return (
            <article className={isSelected ? 'opponent-card is-selected' : 'opponent-card'} key={opponent.id}>
              <div className="opponent-profile">
                <span className="avatar-fallback">{profileFallbackText(opponent)}</span>
                <img src={opponent.profile} alt="" onError={(event) => event.currentTarget.remove()} />
              </div>
              <div>
                <span className="opponent-title">{opponent.title}</span>
                <h2>{opponent.name}</h2>
              </div>
              <p>{opponent.description}</p>
              <div className="opponent-card-footer">
                <span className="opponent-personality-tag">
                  傾向：{opponent.tendencyLabel} / {personalityLabels[opponent.personality]}
                </span>
                <button className="secondary-button opponent-select-toggle" type="button" onClick={() => toggleOpponent(opponent.id)} disabled={isDisabled}>
                  {isSelected ? '移除' : '選入'}
                </button>
              </div>
            </article>
            );
          })}
        </div>

        <div className="entry-actions align-end">
          <button className="entry-primary-button" type="button" onClick={() => onStart(selectedOpponents)} disabled={!canStart}>
            開始審判
          </button>
        </div>
      </section>
    </main>
  );
}

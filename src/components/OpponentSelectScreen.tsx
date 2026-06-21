import type { CSSProperties } from 'react';
import { DEFAULT_OPPONENTS, type OpponentMetadata } from '../game/opponents';
import type { BotPersonality } from '../game/types';
import { backgroundImages } from './assetMap';

interface OpponentSelectScreenProps {
  opponents?: OpponentMetadata[];
  onBack: () => void;
  onStart: (opponents: OpponentMetadata[]) => void;
}

const personalityLabels: Record<BotPersonality, string> = {
  honest: '守信型',
  opportunist: '投機型',
  observer: '觀望型'
};

function avatarFallbackText(opponent: OpponentMetadata): string {
  return opponent.name.slice(0, 2);
}

export function OpponentSelectScreen({ opponents = DEFAULT_OPPONENTS, onBack, onStart }: OpponentSelectScreenProps) {
  const screenStyle = { '--trial-room-bg': `url(${backgroundImages.trialRoom})` } as CSSProperties;

  return (
    <main className="entry-shell opponent-select-screen" style={screenStyle}>
      <section className="opponent-select-panel">
        <div className="entry-panel-heading">
          <div>
            <span className="eyebrow">Opponent Select</span>
            <h1>選擇對手</h1>
            <p>本試玩版固定帶入三名審判者，底層 Bot 行為維持原人格邏輯。</p>
          </div>
          <button className="secondary-button" type="button" onClick={onBack}>
            回到主畫面
          </button>
        </div>

        <div className="opponent-card-grid" aria-label="已選入對手">
          {opponents.map((opponent) => (
            <article className="opponent-card" key={opponent.id}>
              <div className="opponent-avatar">
                <span className="avatar-fallback">{avatarFallbackText(opponent)}</span>
                <img src={opponent.avatar} alt="" onError={(event) => event.currentTarget.remove()} />
              </div>
              <div>
                <span className="opponent-title">{opponent.title}</span>
                <h2>{opponent.name}</h2>
              </div>
              <p>{opponent.description}</p>
              <div className="opponent-card-footer">
                <span className="opponent-personality-tag">{personalityLabels[opponent.personality]}</span>
                <span className="tag">已選入</span>
              </div>
            </article>
          ))}
        </div>

        <div className="entry-actions align-end">
          <button className="entry-primary-button" type="button" onClick={() => onStart(opponents)}>
            開始審判
          </button>
        </div>
      </section>
    </main>
  );
}

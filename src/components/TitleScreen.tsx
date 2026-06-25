import type { CSSProperties } from 'react';
import { backgroundImages } from './assetMap';

interface TitleScreenProps {
  completedTutorial: boolean;
  onStart: () => void;
  onStartTutorial: () => void;
}

export function TitleScreen({ completedTutorial, onStart, onStartTutorial }: TitleScreenProps) {
  const screenStyle = { '--trial-room-bg': `url(${backgroundImages.trialRoom})` } as CSSProperties;

  return (
    <main className="entry-shell title-screen" style={screenStyle}>
      <section className="entry-hero game-title-menu">
        <h1 aria-label="審判困境">
          <span>審判困境</span>
        </h1>
        <p>審判，即將開始</p>
        {!completedTutorial ? <p className="entry-tutorial-hint">第一次進入審判？建議先完成一次新手教學。</p> : null}
        <nav className="entry-actions title-menu-actions" aria-label="主畫面選單">
          <button className="entry-primary-button" type="button" onClick={onStart}>
            開始審判
          </button>
          <button className="secondary-button entry-secondary-button" type="button" onClick={onStartTutorial}>
            新手教學
          </button>
        </nav>
        <details className="entry-rule-card">
          <summary>規則簡介</summary>
          <ul>
            <li>達到 11 點勝利，降至 0 點出局。</li>
            <li>每回合公開承諾，再暗放合作或背叛。</li>
            <li>守諾 +1，失信 -1。</li>
            <li>每回合最多使用 1 張功能牌。</li>
          </ul>
        </details>
      </section>
    </main>
  );
}

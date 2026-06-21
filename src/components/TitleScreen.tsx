import type { CSSProperties } from 'react';
import { backgroundImages } from './assetMap';

interface TitleScreenProps {
  onStart: () => void;
}

export function TitleScreen({ onStart }: TitleScreenProps) {
  const screenStyle = { '--trial-room-bg': `url(${backgroundImages.trialRoom})` } as CSSProperties;

  return (
    <main className="entry-shell title-screen" style={screenStyle}>
      <section className="entry-hero game-title-menu">
        <span className="entry-kicker">地下審判庭</span>
        <h1 aria-label="審判困境">
          <span>審判</span>
          <span>困境</span>
        </h1>
        <p>承諾與背叛，都會在裁決桌上留下代價。</p>
        <nav className="entry-actions title-menu-actions" aria-label="主選單">
          <button className="entry-primary-button" type="button" onClick={onStart}>
            開始審判
          </button>
        </nav>
        <details className="entry-rule-card">
          <summary>規則簡介</summary>
          <ul>
            <li>達到 11 點勝利，降至 0 點出局。</li>
            <li>每回合公開承諾合作或背叛，再暗放真正陣營。</li>
            <li>守諾 +1，失信 -1。</li>
            <li>每回合最多使用 1 張功能牌。</li>
          </ul>
        </details>
      </section>
    </main>
  );
}

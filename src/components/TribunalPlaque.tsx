import type { ReactNode } from 'react';
import '../styles/tribunal-plaque.css';

interface TribunalPlaqueProps {
  children: ReactNode;
}

// 階段廣播與結果標題共用同一塊審判銘牌；裝飾不參與操作或朗讀。
export function TribunalPlaque({ children }: TribunalPlaqueProps) {
  return (
    <div className="tribunal-plaque">
      <svg className="tribunal-plaque-ornament" viewBox="0 0 40 72" fill="none" stroke="currentColor" aria-hidden="true" focusable="false">
        <path d="M26 3 12 17v15L5 36l7 4v15l14 14M31 10 20 21v30l11 11M20 25l-7 11 7 11 7-11-7-11Z" />
        <path d="M20 31v10M15 36h10M31 25v22" opacity=".55" />
      </svg>
      <div className="tribunal-plaque-copy">{children}</div>
      <svg className="tribunal-plaque-ornament is-right" viewBox="0 0 40 72" fill="none" stroke="currentColor" aria-hidden="true" focusable="false">
        <path d="M26 3 12 17v15L5 36l7 4v15l14 14M31 10 20 21v30l11 11M20 25l-7 11 7 11 7-11-7-11Z" />
        <path d="M20 31v10M15 36h10M31 25v22" opacity=".55" />
      </svg>
    </div>
  );
}

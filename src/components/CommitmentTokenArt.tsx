import type { Faction } from '../game/types';
import { commitmentTokenImageByFaction } from './assetMap';
import '../styles/commitment-token.css';

interface CommitmentTokenArtProps {
  faction: Faction;
  className?: string;
  label?: string;
}

// 只以視窗裁掉原 PNG 的透明留白；圖案與來源檔案完全保留。
export function CommitmentTokenArt({ faction, className = '', label }: CommitmentTokenArtProps) {
  return (
    <span className={`commitment-token-art ${className}`} data-commitment={faction}
      role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      <img src={commitmentTokenImageByFaction[faction]} alt="" draggable={false} />
    </span>
  );
}

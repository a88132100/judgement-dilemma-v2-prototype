import { createPortal } from 'react-dom';
import type { PlayerState } from '../game/types';
import { cardImageByType } from './assetMap';

interface CardEffectOverlayProps {
  confirmed: boolean;
  disabledConfirm: boolean;
  isOpen: boolean;
  notice: string;
  selectedTargetId: string;
  targetPlayers: PlayerState[];
  onCancelTarget: () => void;
  onConfirmTarget: () => void;
  onKeepFaction: () => void;
  onSwitchFaction: () => void;
  onTargetChange: (playerId: string) => void;
}

export function CardEffectOverlay({
  confirmed,
  disabledConfirm,
  isOpen,
  notice,
  selectedTargetId,
  targetPlayers,
  onCancelTarget,
  onConfirmTarget,
  onKeepFaction,
  onSwitchFaction,
  onTargetChange
}: CardEffectOverlayProps) {
  if (!isOpen) {
    return null;
  }

  const overlay = (
    <div className="card-effect-backdrop" role="presentation">
      <section className="card-effect-panel" role="dialog" aria-modal="true" aria-label="真理之眼觸發">
        <div className="card-effect-heading">
          <span>公開功能牌</span>
          <strong>真理之眼觸發</strong>
        </div>

        <div className="card-effect-body">
          <img className="card-effect-card" src={cardImageByType.peek} alt="" onError={(event) => event.currentTarget.remove()} />
          <div className="card-effect-copy">
            <p>選擇 1 名其他玩家，私下查看其本回合暗放的陣營牌。</p>
            <label className="operation-select">
              目標玩家
              <select value={selectedTargetId} onChange={(event) => onTargetChange(event.target.value)} disabled={confirmed}>
                {targetPlayers.map((player) => (
                  <option value={player.id} key={player.id}>
                    {player.name}
                  </option>
                ))}
              </select>
            </label>
            {!confirmed && targetPlayers.length === 0 ? <span className="stage-empty">沒有可指定的其他玩家</span> : null}
            {!confirmed ? <p className="peek-instruction">選定後將無法改查第二名玩家。</p> : null}
            {confirmed && notice ? <p className="peek-private-result">{notice}</p> : null}
          </div>
        </div>

        {!confirmed ? (
          <div className="card-effect-actions">
            <button className="secondary-button quiet-button" type="button" onClick={onCancelTarget}>
              取消
            </button>
            <button className="confirm-button" type="button" onClick={onConfirmTarget} disabled={disabledConfirm}>
              確認真理之眼
            </button>
          </div>
        ) : (
          <div className="card-effect-actions">
            <button className="secondary-button quiet-button" type="button" onClick={onKeepFaction}>
              維持原選擇
            </button>
            <button className="confirm-button" type="button" onClick={onSwitchFaction}>
              更換我的陣營
            </button>
          </div>
        )}
      </section>
    </div>
  );

  return typeof document === 'undefined' ? overlay : createPortal(overlay, document.body);
}

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { cardBackImage, cardImageByType, commitmentTokenImageByFaction, factionCardImageByFaction } from './assetMap';
import { getCardDetail, type CardDetailTarget } from './cardDetails';

interface CardDetailPanelProps {
  target: CardDetailTarget;
  onClose: () => void;
}

function imageForTarget(target: CardDetailTarget): string {
  if (target.kind === 'commitment') {
    return commitmentTokenImageByFaction[target.faction];
  }
  if (target.kind === 'faction') {
    return factionCardImageByFaction[target.faction];
  }
  if (target.kind === 'blankFunction') {
    return cardBackImage;
  }
  return cardImageByType[target.cardType];
}

export function CardDetailPanel({ target, onClose }: CardDetailPanelProps) {
  const detail = getCardDetail(target);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const modal = (
    <div className="card-detail-backdrop" onClick={onClose}>
      <aside className="card-detail-panel" role="dialog" aria-modal="true" aria-label={`${detail.name} 詳細資訊`} onClick={(event) => event.stopPropagation()}>
        <button className="card-detail-close" type="button" onClick={onClose} aria-label="關閉卡牌資訊">
          關閉
        </button>
        <div className="card-detail-visual">
          <img src={imageForTarget(target)} alt="" onError={(event) => event.currentTarget.remove()} />
        </div>
        <div className="card-detail-copy">
          <span className="card-detail-type">{detail.typeLabel}</span>
          <h2>{detail.name}</h2>
          <dl>
            <div>
              <dt>發動時機</dt>
              <dd>{detail.timing}</dd>
            </div>
            <div>
              <dt>效果說明</dt>
              <dd>{detail.effect}</dd>
            </div>
            <div>
              <dt>限制與備註</dt>
              <dd>{detail.notes}</dd>
            </div>
          </dl>
        </div>
      </aside>
    </div>
  );

  return typeof document === 'undefined' ? modal : createPortal(modal, document.body);
}

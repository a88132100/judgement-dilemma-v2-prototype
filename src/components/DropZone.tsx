import { useState, type DragEvent, type ReactNode } from 'react';
import { DRAG_DATA_TYPE, type DragPayload } from './dragTypes';
import { CARD_LABELS } from '../game/constants';

export interface DropPoint {
  clientX: number;
  clientY: number;
}

interface DropZoneProps {
  children?: ReactNode;
  className?: string;
  hint: string;
  title: string;
  active?: boolean;
  onDropPayload: (payload: DragPayload, point: DropPoint) => boolean;
}

export function DropZone({ children, className = '', hint, title, active = true, onDropPayload }: DropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  function readPayload(event: DragEvent<HTMLElement>): DragPayload | undefined {
    const rawPayload = event.dataTransfer.getData(DRAG_DATA_TYPE);
    if (!rawPayload) {
      return undefined;
    }
    try {
      const payload = JSON.parse(rawPayload) as Partial<DragPayload> | null;
      if (!payload || typeof payload !== 'object') {
        return undefined;
      }
      if ((payload.kind === 'commitment' || payload.kind === 'faction') && (payload.faction === 'alliance' || payload.faction === 'betrayal')) {
        return payload as DragPayload;
      }
      if (payload.kind === 'card' && typeof payload.cardType === 'string' && Object.hasOwn(CARD_LABELS, payload.cardType)) {
        return payload as DragPayload;
      }
      return undefined;
    } catch {
      return undefined;
    }
  }

  function handleDragOver(event: DragEvent<HTMLElement>) {
    if (active && event.dataTransfer.types.includes(DRAG_DATA_TYPE)) {
      event.preventDefault();
      event.dataTransfer.dropEffect = 'copy';
      setIsDragOver(true);
    }
  }

  function handleDrop(event: DragEvent<HTMLElement>) {
    event.preventDefault();
    setIsDragOver(false);
    if (!active) {
      return;
    }
    const payload = readPayload(event);
    if (payload) {
      onDropPayload(payload, { clientX: event.clientX, clientY: event.clientY });
    }
  }

  return (
    <section
      className={`table-cast-surface ${active ? 'is-active' : ''} ${isDragOver ? 'is-drag-over' : ''} ${className}`}
      aria-label={title}
      aria-description={hint}
      onDragLeave={(event) => {
        if (!(event.relatedTarget instanceof Node) || !event.currentTarget.contains(event.relatedTarget)) {
          setIsDragOver(false);
        }
      }}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {children}
    </section>
  );
}

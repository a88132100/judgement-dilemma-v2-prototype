import { useState, type DragEvent, type ReactNode } from 'react';
import { DRAG_DATA_TYPE, type DragPayload } from './dragTypes';

interface DropZoneProps {
  children?: ReactNode;
  className?: string;
  hint: string;
  title: string;
  onDropPayload: (payload: DragPayload) => boolean;
}

export function DropZone({ children, className = '', hint, title, onDropPayload }: DropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  function readPayload(event: DragEvent<HTMLElement>): DragPayload | undefined {
    const rawPayload = event.dataTransfer.getData(DRAG_DATA_TYPE);
    if (!rawPayload) {
      return undefined;
    }
    try {
      return JSON.parse(rawPayload) as DragPayload;
    } catch {
      return undefined;
    }
  }

  function handleDragOver(event: DragEvent<HTMLElement>) {
    if (event.dataTransfer.types.includes(DRAG_DATA_TYPE)) {
      event.preventDefault();
      event.dataTransfer.dropEffect = 'copy';
      setIsDragOver(true);
    }
  }

  function handleDrop(event: DragEvent<HTMLElement>) {
    event.preventDefault();
    setIsDragOver(false);
    const payload = readPayload(event);
    if (payload) {
      onDropPayload(payload);
    }
  }

  return (
    <section className={`drop-zone ${isDragOver ? 'is-drag-over' : ''} ${className}`} onDragLeave={() => setIsDragOver(false)} onDragOver={handleDragOver} onDrop={handleDrop}>
      <span className="drop-zone-title">{title}</span>
      <div className="drop-zone-body">{children ?? <span className="drop-zone-hint">{hint}</span>}</div>
    </section>
  );
}

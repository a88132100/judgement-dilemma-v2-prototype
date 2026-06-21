import type { DragEvent, ReactNode } from 'react';
import { DRAG_DATA_TYPE, type DragPayload } from './dragTypes';

interface DraggableCardProps {
  className?: string;
  disabled?: boolean;
  imageSrc?: string;
  label: string;
  note?: string;
  payload: DragPayload;
  selected?: boolean;
  onClick?: () => void;
  children?: ReactNode;
}

export function DraggableCard({ className = '', disabled = false, imageSrc, label, note, payload, selected = false, onClick, children }: DraggableCardProps) {
  function handleDragStart(event: DragEvent<HTMLButtonElement>) {
    if (disabled) {
      event.preventDefault();
      return;
    }
    event.dataTransfer.effectAllowed = 'copy';
    event.dataTransfer.setData(DRAG_DATA_TYPE, JSON.stringify(payload));
  }

  return (
    <button
      className={`draggable-card ${selected ? 'is-selected' : ''} ${disabled ? 'is-disabled' : ''} ${className}`}
      type="button"
      draggable={!disabled}
      aria-pressed={selected}
      onClick={onClick}
      onDragStart={handleDragStart}
    >
      {imageSrc ? <img className="draggable-card-image" src={imageSrc} alt="" onError={(event) => event.currentTarget.remove()} /> : null}
      <span className="draggable-card-label">{label}</span>
      {note ? <span className="draggable-card-note">{note}</span> : null}
      {children}
    </button>
  );
}

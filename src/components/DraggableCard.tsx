import { useEffect, useRef, useState, type DragEvent, type ReactNode } from 'react';
import { DRAG_DATA_TYPE, type DragPayload } from './dragTypes';
import { CommitmentTokenArt } from './CommitmentTokenArt';

interface DraggableCardProps {
  className?: string;
  disabled?: boolean;
  imageSrc?: string;
  label: string;
  note?: string;
  payload: DragPayload;
  selected?: boolean;
  onClick?: (source: HTMLButtonElement) => void;
  onPickUp?: (source: HTMLButtonElement) => void;
  onInspect?: () => void;
  children?: ReactNode;
}

export function DraggableCard({ className = '', disabled = false, imageSrc, label, note, payload, selected = false, onClick, onPickUp, onInspect, children }: DraggableCardProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isRaised, setIsRaised] = useState(false);
  const pieceRef = useRef<HTMLSpanElement>(null);
  const pointerType = useRef('');

  // 觸控點一下選牌並抬起，真正送出仍由操作區確認；點到別處收回牌面。
  useEffect(() => {
    if (!isRaised) return;
    const collapseOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !pieceRef.current?.contains(event.target)) setIsRaised(false);
    };
    document.addEventListener('pointerdown', collapseOutside);
    return () => document.removeEventListener('pointerdown', collapseOutside);
  }, [isRaised]);

  useEffect(() => { if (!selected || disabled) setIsRaised(false); }, [selected, disabled]);

  function handleDragStart(event: DragEvent<HTMLButtonElement>) {
    if (disabled) {
      event.preventDefault();
      return;
    }
    event.dataTransfer.effectAllowed = 'copy';
    event.dataTransfer.setData(DRAG_DATA_TYPE, JSON.stringify(payload));
    onPickUp?.(event.currentTarget);
    setIsDragging(true);
  }

  return (
    <span ref={pieceRef} className={`card-piece card-piece-${payload.kind} ${isRaised ? 'is-raised' : ''}`}>
      <button
        className={`draggable-card ${selected ? 'is-selected' : ''} ${disabled ? 'is-disabled' : ''} ${isDragging ? 'is-dragging' : ''} ${className}`}
        type="button"
        draggable={!disabled}
        aria-pressed={selected}
        aria-expanded={isRaised}
        onPointerDown={(event) => { pointerType.current = event.pointerType; }}
        onKeyDown={() => { pointerType.current = ''; }}
        onClick={(event) => {
          if (pointerType.current === 'touch') {
            if (disabled) {
              onInspect?.();
              return;
            }
            onClick?.(event.currentTarget);
            setIsRaised(true);
            return;
          }
          onClick?.(event.currentTarget);
        }}
        onDragStart={handleDragStart}
        onDragEnd={() => setIsDragging(false)}
      >
        {payload.kind === 'commitment' ? <CommitmentTokenArt faction={payload.faction} className="draggable-card-image" />
          : imageSrc ? <img className="draggable-card-image" src={imageSrc} alt="" onError={(event) => event.currentTarget.remove()} /> : null}
        <span className="draggable-card-label">{label}</span>
        {note ? <span className="draggable-card-note">{note}</span> : null}
        {children}
      </button>
      {onInspect ? <button className="card-inspect-button" type="button" onClick={onInspect} aria-label={`查看${label}說明`}>查看</button> : null}
    </span>
  );
}

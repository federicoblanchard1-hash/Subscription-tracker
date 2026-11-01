import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Icon } from './Icon';

const ACTION_W = 78;

interface Props {
  children: ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete: () => void;
  onPause: () => void;
  paused: boolean;
  className?: string;
}

/**
 * iOS-style swipe row: swipe left to reveal Pause / Delete, or swipe all the way to delete.
 * Vertical scrolling is left alone until the gesture is clearly horizontal.
 */
export function SwipeRow({ children, open, onOpenChange, onDelete, onPause, paused, className = '' }: Props) {
  const ref = useRef<HTMLLIElement>(null);
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [removing, setRemoving] = useState(false);
  const g = useRef({ x: 0, y: 0, start: 0, axis: '' as '' | 'x' | 'y', id: -1, moved: false });
  const openW = ACTION_W * 2;

  useEffect(() => { if (!open && !dragging) setOffset(0); }, [open, dragging]);

  // tap anywhere else closes an open row
  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node)) onOpenChange(false); };
    document.addEventListener('pointerdown', close, true);
    return () => document.removeEventListener('pointerdown', close, true);
  }, [open, onOpenChange]);

  const width = () => ref.current?.offsetWidth ?? 360;
  const fullAt = () => Math.max(openW + 40, width() * 0.6);

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    g.current = { x: e.clientX, y: e.clientY, start: open ? -openW : 0, axis: '', id: e.pointerId, moved: false };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const s = g.current;
    if (s.id !== e.pointerId) return;
    const dx = e.clientX - s.x, dy = e.clientY - s.y;
    if (!s.axis) {
      if (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy) * 1.2) {
        s.axis = 'x';
        s.moved = true;
        setDragging(true);
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      } else if (Math.abs(dy) > 8) {
        s.axis = 'y';
      }
      return;
    }
    if (s.axis !== 'x') return;
    let next = s.start + dx;
    if (next > 0) next = next * 0.2; // rubber band to the right
    setOffset(Math.max(next, -width()));
  };

  const end = (e: React.PointerEvent) => {
    const s = g.current;
    if (s.id !== e.pointerId) return;
    s.id = -1;
    if (s.axis !== 'x') return;
    setDragging(false);
    if (-offset >= fullAt()) {
      setRemoving(true);
      setOffset(-width());
      window.setTimeout(onDelete, 180);
    } else if (-offset > openW / 2) {
      setOffset(-openW);
      onOpenChange(true);
    } else {
      setOffset(0);
      onOpenChange(false);
    }
  };

  // swallow the click that ends a drag, and use a tap on an open row to close it
  const onClickCapture = (e: React.MouseEvent) => {
    if (g.current.moved || open) {
      e.stopPropagation();
      e.preventDefault();
      g.current.moved = false;
      if (open) onOpenChange(false);
    }
  };

  const reveal = -offset;
  const pastFull = reveal >= fullAt();

  return (
    <li ref={ref} className={`${className} swipe${removing ? ' removing' : ''}`}>
      <div className="swipe-actions" style={{ width: Math.max(reveal, 0) }} aria-hidden={!open}>
        {!pastFull && (
          <button className="swipe-btn pause" tabIndex={open ? 0 : -1} onClick={() => { onOpenChange(false); onPause(); }}>
            <Icon name={paused ? 'play' : 'pause'} size={18} />
            <span>{paused ? 'Resume' : 'Pause'}</span>
          </button>
        )}
        <button className="swipe-btn delete" tabIndex={open ? 0 : -1} onClick={() => { setRemoving(true); onDelete(); }}>
          <Icon name="trash" size={18} />
          <span>Delete</span>
        </button>
      </div>
      <div
        className={`swipe-fg${dragging ? ' dragging' : ''}`}
        style={{ transform: offset ? `translate3d(${offset}px,0,0)` : undefined }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={end}
        onPointerCancel={end}
        onClickCapture={onClickCapture}
      >
        {children}
      </div>
    </li>
  );
}

'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

// One shared detail surface for the home page. On desktop (≥768px) it's a
// right-hand slide-over; on mobile it's a bottom sheet covering ~80% of the
// viewport, dismissible by dragging it down. Dismiss also via the X button,
// a click on the dimmed backdrop, or Escape. Active Bets and Renewals both
// mount their own content into it rather than each shipping a bespoke panel.
export default function DetailPanel({ open, onClose, title, badge, tone = 'orange', children }) {
  const sheetRef = useRef(null);
  const dragStartY = useRef(null);
  const [dragY, setDragY] = useState(0);

  // Escape to close + lock body scroll while open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  // Reset any leftover drag offset whenever the panel (re)opens.
  useEffect(() => { if (open) setDragY(0); }, [open]);

  if (!open || typeof document === 'undefined') return null;

  // Bottom-sheet drag-to-dismiss (mobile). Only tracks downward drags; a drag
  // past ~120px (or a fast flick) closes, otherwise the sheet springs back.
  function onTouchStart(e) { dragStartY.current = e.touches[0].clientY; }
  function onTouchMove(e) {
    if (dragStartY.current == null) return;
    const delta = e.touches[0].clientY - dragStartY.current;
    if (delta > 0) setDragY(delta);
  }
  function onTouchEnd() {
    if (dragY > 120) onClose();
    else setDragY(0);
    dragStartY.current = null;
  }

  // Portalled to <body> so the fixed backdrop escapes the main-content
  // stacking context and truly overlays everything — including the z-100
  // sidebar — making it a real modal (dim + click-outside anywhere).
  return createPortal(
    <div className="dp-backdrop" onClick={onClose}>
      <div
        ref={sheetRef}
        className={`dp-panel dp-tone-${tone}`}
        style={dragY ? { transform: `translateY(${dragY}px)`, transition: 'none' } : undefined}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : 'Details'}
      >
        <div className="dp-grabber" onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd} />
        <header className="dp-head">
          <div className="dp-head-titles">
            {badge && <span className={`dp-badge dp-badge-${tone}`}>{badge}</span>}
            <h3 className="dp-title">{title}</h3>
          </div>
          <button className="dp-close" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </header>
        <div className="dp-body">{children}</div>
      </div>
    </div>,
    document.body
  );
}

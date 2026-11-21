'use client';
import { useEffect, useRef, useState } from 'react';
import { IconClose } from '@/components/icons';

// A sheet: rises from the bottom edge on phones, a centred dialog on wider screens.
// Esc, the backdrop and the close button dismiss it; focus moves in and back out.
export function Sheet({ open, onClose, label, children }: { open: boolean; onClose: () => void; label: string; children: React.ReactNode }) {
  const [mounted, setMounted] = useState(open);
  const [shown, setShown] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const returnTo = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (open) {
      returnTo.current = document.activeElement as HTMLElement | null;
      setMounted(true);
      const id = requestAnimationFrame(() => requestAnimationFrame(() => setShown(true)));
      return () => cancelAnimationFrame(id);
    }
    setShown(false);
    const t = window.setTimeout(() => setMounted(false), 320);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!mounted) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const lenis = (window as unknown as { __lenis?: { stop: () => void; start: () => void } }).__lenis;
    lenis?.stop();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
      lenis?.start();
      returnTo.current?.focus?.();
    };
  }, [mounted, onClose]);

  useEffect(() => { if (shown) closeRef.current?.focus(); }, [shown]);

  if (!mounted) return null;
  return (
    <div className={`sheet-root ${shown ? 'on' : ''}`}>
      <div className="sheet-backdrop" onClick={onClose} aria-hidden="true" />
      <div className="sheet" data-lenis-prevent role="dialog" aria-modal="true" aria-label={label}>
        <div className="sheet-grabber" aria-hidden="true" />
        <button ref={closeRef} type="button" className="sheet-close" onClick={onClose} aria-label="Tutup"><IconClose /></button>
        {children}
      </div>
    </div>
  );
}

'use client';
import { useEffect, useRef } from 'react';
import type { MapApi } from '@/lib/three/riauMap';

export function Map3D({ counts, interactive = true, selected, onSelect, className = '' }: {
  counts: Record<string, number>;
  interactive?: boolean;
  selected?: string | null;
  onSelect?: (key: string | null) => void;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const api = useRef<MapApi | null>(null);
  const cb = useRef(onSelect);
  cb.current = onSelect;

  useEffect(() => {
    let cancelled = false;
    import('@/lib/three/riauMap').then(({ mountRiauMap }) => {
      if (cancelled || !ref.current) return;
      api.current = mountRiauMap(ref.current, {
        counts,
        interactive,
        theme: (document.documentElement.dataset.theme as 'dark' | 'light') || 'dark',
        reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
        onSelect: (k) => cb.current?.(k),
      });
    });
    return () => { cancelled = true; api.current?.dispose(); api.current = null; };
    // counts is a fresh object from the server on each load
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(counts), interactive]);

  useEffect(() => { api.current?.select(selected ?? null); }, [selected]);

  return <div ref={ref} className={`map3d ${className}`} role="img" aria-label="Peta tiga dimensi Provinsi Riau dengan jumlah anggota per kabupaten" />;
}

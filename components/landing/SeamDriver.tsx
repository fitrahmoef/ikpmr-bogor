'use client';
import { useEffect } from 'react';

// Every section after the hero opens with a thin pucuk rebung border, the tepi of a songket cloth,
// stitched across the boundary. It weaves out from the centre as the boundary rises up the screen
// and unweaves when scrolling back. This only writes --seam (0..1); the drawing is CSS.
export function SeamDriver() {
  useEffect(() => {
    const sections = Array.from(document.querySelectorAll<HTMLElement>('main > section:not(#hero)'));
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      sections.forEach((s) => s.style.setProperty('--seam', '1'));
      return;
    }
    let raf = 0;
    const read = () => {
      raf = 0;
      const vh = window.innerHeight;
      for (const s of sections) {
        const top = s.getBoundingClientRect().top;
        const t = Math.min(1, Math.max(0, (vh * 0.92 - top) / (vh * 0.36)));
        s.style.setProperty('--seam', (t * t * (3 - 2 * t)).toFixed(3));
      }
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(read); };
    read();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); cancelAnimationFrame(raf); };
  }, []);
  return null;
}

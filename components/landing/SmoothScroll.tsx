'use client';
import { useEffect } from 'react';
import Lenis from 'lenis';

// Inertial scroll on desktop pointers only. Phones, touch screens and reduced motion keep the
// native scroll. Sheets stop it while open; inner scroll areas opt out with data-lenis-prevent.
export function SmoothScroll() {
  useEffect(() => {
    if (window.matchMedia('(pointer: coarse), (prefers-reduced-motion: reduce)').matches) return;
    const lenis = new Lenis({ lerp: 0.09, wheelMultiplier: 0.9, anchors: { offset: -64 } });
    (window as unknown as { __lenis?: Lenis }).__lenis = lenis;
    let raf = requestAnimationFrame(function loop(t) { lenis.raf(t); raf = requestAnimationFrame(loop); });
    return () => { cancelAnimationFrame(raf); lenis.destroy(); delete (window as unknown as { __lenis?: Lenis }).__lenis; };
  }, []);
  return null;
}

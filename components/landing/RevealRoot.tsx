'use client';
import { useEffect } from 'react';

const GLYPHS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

// Decode a heading line: letters cycle through random glyphs and settle left to right.
// The width is locked first, so the line never jitters while it resolves.
function decode(el: HTMLElement, delay: number) {
  const final = el.dataset.text ?? el.textContent ?? '';
  el.dataset.text = final;
  el.style.width = `${el.getBoundingClientRect().width}px`;
  el.style.whiteSpace = 'nowrap';
  const dur = 720;
  let start = 0;
  const step = (now: number) => {
    if (!start) start = now + delay;
    const t = (now - start) / dur;
    if (t < 0) { requestAnimationFrame(step); return; }
    if (t >= 1) { el.textContent = final; el.style.width = ''; el.style.whiteSpace = ''; return; }
    const settled = Math.floor(final.length * t * t * (3 - 2 * t));
    let out = final.slice(0, settled);
    for (let i = settled; i < final.length; i++) {
      const c = final[i];
      out += c === ' ' ? ' ' : GLYPHS[(Math.random() * GLYPHS.length) | 0];
    }
    el.textContent = out;
    requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

// Drives the scroll transitions on the landing page:
// [data-reveal] gets .visible when it enters, its heading lines decode, [data-count] tweens once.
export function RevealRoot() {
  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const countUp = (el: HTMLElement) => {
      const to = Number(el.dataset.count);
      if (!Number.isFinite(to) || reduce) { el.textContent = String(to); return; }
      const start = performance.now();
      const dur = 1200;
      const step = (now: number) => {
        const p = Math.min((now - start) / dur, 1);
        el.textContent = Math.round(to * (1 - Math.pow(1 - p, 4))).toString();
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };

    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        const el = e.target as HTMLElement;
        el.classList.add('visible');
        el.querySelectorAll<HTMLElement>('[data-count]').forEach(countUp);
        if (!reduce) {
          el.querySelectorAll<HTMLElement>('.mask-line > span').forEach((s, i) => {
            const d = parseFloat(getComputedStyle(s).getPropertyValue('--d')) || i * 90;
            decode(s, d + 120);
          });
        }
        io.unobserve(el);
      }
    }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });

    const observe = () => document.querySelectorAll('[data-reveal]:not(.visible)').forEach((el) => io.observe(el));
    observe();
    const mo = new MutationObserver(observe);
    mo.observe(document.body, { childList: true, subtree: true });
    return () => { io.disconnect(); mo.disconnect(); };
  }, []);
  return null;
}

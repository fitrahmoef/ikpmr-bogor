'use client';
import { useEffect, useRef, useState } from 'react';
import { finishOpening, loadedSoFar } from '@/lib/opening';

// Before paint: skip the opening for returning visitors in this session and for reduced motion.
export const openingInitScript = `(function(){try{if(location.pathname!=='/'||sessionStorage.getItem('ikpmr-opened')||matchMedia('(prefers-reduced-motion: reduce)').matches){document.documentElement.classList.add('skip-opening')}else{document.documentElement.classList.add('opening-lock')}}catch(e){document.documentElement.classList.add('skip-opening')}})()`;

const MIN_MS = 1400;  // never flash
const MAX_MS = 7000;  // never hang on a slow device
const LIFT = 800;

// Preloader: a selembayung and a row of pucuk rebung are drawn as thin lines while the page
// really loads (fonts, the 3D module, the hall model, its first frame). The figure is that progress.
export function Opening() {
  const [phase, setPhase] = useState<'show' | 'lift' | 'gone'>('show');
  const [shown, setShown] = useState(0);
  const target = useRef(0);

  useEffect(() => {
    const root = document.documentElement;
    if (root.classList.contains('skip-opening')) {
      finishOpening();
      setPhase('gone');
      return;
    }
    const t0 = performance.now();
    target.current = loadedSoFar();
    const onLoad = (e: Event) => { target.current = (e as CustomEvent<number>).detail; };
    window.addEventListener('ikpmr-load', onLoad);

    let raf = 0, cur = 0, last = t0, lifted = false;
    const lift = () => {
      if (lifted) return;
      lifted = true;
      setPhase('lift');
      finishOpening(); // the hall assembles as the curtain rises
      root.classList.remove('opening-lock');
      try { sessionStorage.setItem('ikpmr-opened', '1'); } catch {}
      window.setTimeout(() => setPhase('gone'), LIFT);
    };
    const tick = (now: number) => {
      const elapsed = now - t0;
      const goal = elapsed > MAX_MS ? 1 : target.current;
      // time-based easing: a phone stuck at a few frames per second still finishes on time
      const dt = Math.min(0.25, (now - last) / 1000);
      last = now;
      cur += (goal - cur) * (1 - Math.exp(-dt * 6));
      if (goal - cur < 0.002) cur = goal;
      setShown(cur);
      if ((cur >= 0.999 && elapsed >= MIN_MS) || elapsed > MAX_MS + 1200) { lift(); return; }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    (window as unknown as { __skipOpening?: () => void }).__skipOpening = () => { cancelAnimationFrame(raf); lift(); };
    return () => { cancelAnimationFrame(raf); window.removeEventListener('ikpmr-load', onLoad); };
  }, []);

  if (phase === 'gone') return null;
  const draw = { strokeDasharray: 1, strokeDashoffset: 1 - shown };
  return (
    <div className={`opening ${phase === 'lift' ? 'lift' : ''}`} role="presentation">
      <div className="opening-inner">
        <svg className="opening-mark" viewBox="0 0 160 120" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" aria-hidden="true">
          {/* selembayung: two horns crossing above a gable */}
          <path pathLength={1} style={draw} d="M52 104 C62 80 74 60 88 40 C94 30 102 22 112 20 C120 19 124 26 118 32" />
          <path pathLength={1} style={draw} d="M108 104 C98 80 86 60 72 40 C66 30 58 22 48 20 C40 19 36 26 42 32" />
          <path pathLength={1} style={draw} d="M20 112 L80 70 L140 112" />
          <path pathLength={1} style={draw} d="M44 112 L80 87 L116 112" />
        </svg>
        <svg className="opening-band" viewBox="0 0 480 24" fill="none" stroke="currentColor" strokeWidth="1.1" aria-hidden="true">
          {Array.from({ length: 12 }, (_, i) => (
            <path key={i} pathLength={1} style={{ strokeDasharray: 1, strokeDashoffset: 1 - Math.min(1, Math.max(0, shown * 12 - i)) }}
              d={`M${i * 40 + 4} 22 L${i * 40 + 20} 2 L${i * 40 + 36} 22`} />
          ))}
        </svg>
        <div className="opening-name">IKPMR Bogor</div>
        <div className="opening-meta">
          <span>Ikatan Keluarga Pelajar Mahasiswa Riau</span>
          <span className="opening-pct">{String(Math.round(shown * 100)).padStart(3, '0')}</span>
        </div>
      </div>
      <button className="opening-skip" type="button" onClick={() => (window as unknown as { __skipOpening?: () => void }).__skipOpening?.()}>
        Lewati
      </button>
    </div>
  );
}

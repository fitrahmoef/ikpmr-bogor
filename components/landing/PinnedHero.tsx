'use client';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { openingDone, reportLoad } from '@/lib/opening';
import type { HallApi, HudLabel } from '@/lib/three/scene';
import { Rebung } from '@/components/brand';
import { IconArrow } from '@/components/icons';

const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const span = (p: number, a: number, b: number) => clamp01((p - a) / (b - a));

// what each HUD label says, and which side of its anchor it sits on
const HUD: Record<string, { title: string; note: string; side: 'l' | 'r' }> = {
  selembayung: { title: 'Selembayung', note: 'Hiasan bersilang di puncak atap', side: 'r' },
  tingkat: { title: 'Atap lima tingkat', note: 'Dari mahkota sampai portico', side: 'r' },
  lebah: { title: 'Lebah bergantung', note: 'Ukiran gantung di bawah lis atap', side: 'l' },
  portico: { title: 'Portico', note: 'Empat tiang dan jendela bulat', side: 'r' },
  sayap: { title: 'Sayap kembar', note: 'Gable kecil di kiri dan kanan', side: 'r' },
};

// Erase text from the end as t goes 0 -> 1, typewriter style; scrolling back types it in again.
function Erasing({ text, t, caret }: { text: string; t: number; caret?: boolean }) {
  const n = Math.round(text.length * (1 - t));
  return (
    <span aria-hidden="true">
      {text.slice(0, n)}
      {caret && t > 0 && t < 1 && <span className="caret" />}
    </span>
  );
}

// copy comes from Isi situs (lib/content.ts) so admins can change it
export function PinnedHero({ account, eyebrow: EYEBROW, title: TITLE, subtitle: SUB }: {
  account: { href: string; label: string } | null; eyebrow: string; title: string; subtitle: string;
}) {
  const sectionRef = useRef<HTMLElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const copyRef = useRef<HTMLDivElement>(null);
  const [sceneTop, setSceneTop] = useState<number | null>(null); // phones and tablets: where the text ends
  const sceneTopRef = useRef<number | null>(null);
  sceneTopRef.current = sceneTop;
  const api = useRef<HallApi | null>(null);
  const [p, setP] = useState(0);
  const [labels, setLabels] = useState<HudLabel[]>([]);
  const [still, setStill] = useState(false); // reduced motion: no pin, no timeline

  // the hall
  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setStill(reduce);
    let cancelled = false;
    document.fonts?.ready.then(() => reportLoad('fonts'));
    import('@/lib/three/scene').then(({ mountHall }) => {
      reportLoad('module');
      if (cancelled || !sceneRef.current) return;
      api.current = mountHall(sceneRef.current, {
        theme: (document.documentElement.dataset.theme as 'dark' | 'light') || 'dark',
        reducedMotion: reduce,
        startSignal: openingDone,
        onLoad: (stage) => reportLoad(stage),
        onLabels: setLabels,
      });
      api.current?.setStageTop(sceneTopRef.current);
      if (!api.current) { reportLoad('model'); reportLoad('frame'); }
    });
    return () => { cancelled = true; api.current?.dispose(); api.current = null; };
  }, []);

  // scroll progress through the pinned section
  useEffect(() => {
    if (still) return;
    let raf = 0;
    const read = () => {
      raf = 0;
      const el = sectionRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const n = clamp01(-r.top / Math.max(1, r.height - window.innerHeight));
      api.current?.setProgress(n);
      setP((old) => (Math.abs(old - n) > 0.002 ? n : old));
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(read); };
    read();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); cancelAnimationFrame(raf); };
  }, [still]);

  // Phones and tablets stack the text over the hall: the scene learns where the text ends and keeps
  // the hall below it. Measured with the full text in place (load, fonts, resize), never mid-scroll.
  useLayoutEffect(() => {
    const measure = () => {
      const sticky = stickyRef.current, copy = copyRef.current;
      if (!sticky || !copy) return;
      if (window.innerWidth > 1024) { setSceneTop(null); return; }
      const sec = sectionRef.current?.getBoundingClientRect();
      if (sec && sec.top < -8) return; // text already erased; keep the last measurement
      setSceneTop(Math.round(copy.getBoundingClientRect().bottom - sticky.getBoundingClientRect().top + 16));
    };
    measure();
    document.fonts?.ready.then(measure);
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);
  useEffect(() => { api.current?.setStageTop(sceneTop); }, [sceneTop]);

  const stage = p < 0.28 ? 'Rumah adat Melayu Riau' : p < 0.76 ? 'Bagian-bagian rumah' : 'Satu ikatan';
  const stageNo = p < 0.28 ? '01' : p < 0.76 ? '02' : '03';

  return (
    <section id="hero" ref={sectionRef} className={`pin-hero ${still ? 'still' : ''}`}>
      <div className={`pin-sticky ${sceneTop !== null ? 'measured' : ''}`} ref={stickyRef}>
        {/* phones and tablets: nothing of the hall is ever drawn over the text, not even the parts
            dropping in during the entrance; the clip line rises as the text erases */}
        <div className="hero-scene" ref={sceneRef} style={sceneTop !== null ? { clipPath: `inset(${Math.max(0, (sceneTop - 8) * (1 - span(p, 0.06, 0.2))).toFixed(0)}px 0 0 0)` } : undefined} />

        <div className="hud" aria-hidden="true">
          {labels.map((l) => {
            const h = HUD[l.key];
            if (!h || l.visible < 0.01) return null;
            // phones have room for three labels without them landing on each other
            if (typeof window !== 'undefined' && window.innerWidth < 520 && (l.key === 'lebah' || l.key === 'sayap')) return null;
            // flip to the other side when the text would run off the screen
            const vw = typeof window === 'undefined' ? 1440 : window.innerWidth;
            const room = vw < 768 ? 150 : 240;
            const side = l.x + room > vw ? 'l' : l.x - room < 0 ? 'r' : h.side;
            return (
              <div key={l.key} className={`hud-tag ${side}`} style={{ transform: `translate(${l.x.toFixed(1)}px, ${l.y.toFixed(1)}px)`, opacity: l.visible }}>
                <span className="hud-dot" />
                <span className="hud-line" />
                <span className="hud-text"><b>{h.title}</b><span>{h.note}</span></span>
              </div>
            );
          })}
        </div>

        <div className="hero-inner" ref={copyRef}>
          <div className="hero-copy">
            <div className="eyebrow" style={{ opacity: 1 - span(p, 0.2, 0.23) }}><Rebung /><Erasing text={EYEBROW} t={span(p, 0.15, 0.22)} /></div>
            <h1 className="hero-title" aria-label={TITLE}><Erasing text={TITLE} t={span(p, 0.08, 0.2)} caret /></h1>
            <p className="hero-subtitle" aria-label={SUB}><Erasing text={SUB} t={span(p, 0.02, 0.11)} caret /></p>
            <div className="hero-actions" style={{ opacity: 1 - span(p, 0.02, 0.09), visibility: p > 0.1 ? 'hidden' : undefined }}>
              <a href={account?.href ?? '/daftar'} className="btn btn-primary">{account ? account.label : 'Bergabung'} <IconArrow /></a>
              <a href="#programs" className="btn btn-secondary">Lihat program</a>
            </div>
          </div>
        </div>

        <div className="hero-hud-foot" aria-hidden="true" style={sceneTop !== null ? { opacity: span(p, 0.08, 0.18) } : undefined}>
          <span className="hud-mono">{stageNo} / 03</span>
          <span className="hud-stage">{stage}</span>
          <span className="hud-track"><span style={{ transform: `scaleX(${p})` }} /></span>
          <span className="hud-mono hud-hint" style={{ opacity: 1 - span(p, 0, 0.06) }}>Gulir untuk menjelajah</span>
        </div>
      </div>
    </section>
  );
}

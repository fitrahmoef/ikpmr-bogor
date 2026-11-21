'use client';
import { useEffect, useRef, useState } from 'react';
import { Avatar } from '@/components/brand';
import { IconArrow } from '@/components/icons';
import { Segmented } from './Segmented';

type Person = { id: string; name: string; role: string };
export type Division = { name: string; head: Person | null; members: { id: string; name: string; university: string | null }[]; count: number };

const mod = (n: number, m: number) => ((n % m) + m) % m;

// Two layers: the structure (ketua over the core pengurus) and a stack of division cards,
// each holding its member list. Switch with the segments or a horizontal swipe.
export function TeamStage({ ketua, core, divisions }: { ketua: Person | null; core: Person[]; divisions: Division[] }) {
  const [layer, setLayer] = useState<'struktur' | 'divisi'>('struktur');
  const [idx, setIdx] = useState(0);
  const swipe = useRef<{ x: number; y: number } | null>(null);
  const n = divisions.length;

  // "Lihat tim" on the programme wheel opens the matching division here
  useEffect(() => {
    const onOpen = (e: Event) => {
      const i = divisions.findIndex((d) => d.name === (e as CustomEvent<string>).detail);
      if (i >= 0) setIdx(i);
      setLayer('divisi');
    };
    window.addEventListener('ikpmr-open-division', onOpen);
    return () => window.removeEventListener('ikpmr-open-division', onOpen);
  }, [divisions]);

  const step = (d: number) => setIdx((i) => mod(i + d, n));

  return (
    <div className="team">
      <Segmented
        label="Tampilan tim"
        className="team-seg"
        value={layer}
        onChange={setLayer}
        options={[{ value: 'struktur', label: 'Struktur' }, { value: 'divisi', label: 'Divisi' }]}
      />
      <div
        className="team-stage"
        onPointerDown={(e) => { swipe.current = { x: e.clientX, y: e.clientY }; }}
        onPointerUp={(e) => {
          const s = swipe.current;
          swipe.current = null;
          if (!s) return;
          const dx = e.clientX - s.x, dy = e.clientY - s.y;
          if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.4) setLayer(dx < 0 ? 'divisi' : 'struktur');
          else if (layer === 'divisi' && Math.abs(dy) > 40 && Math.abs(dy) > Math.abs(dx) * 1.4 && (e.target as HTMLElement).closest('.dcard.front .dcard-head')) step(dy < 0 ? 1 : -1);
        }}
      >
        {/* layer 1: structure */}
        <div className={`team-layer struct ${layer === 'struktur' ? 'on' : 'off-left'}`} aria-hidden={layer !== 'struktur'}>
          {ketua && (
            <div className="struct-top">
              <Avatar name={ketua.name} className="av-xl" />
              <div className="struct-name">{ketua.name}</div>
              <div className="struct-role">{ketua.role}</div>
            </div>
          )}
          {core.length > 0 && <>
            <div className="struct-stem" aria-hidden="true" />
            <div className="struct-row" style={{ ['--cols' as string]: core.length }}>
              <span className="struct-bar" aria-hidden="true" />
              {core.map((p) => (
                <button key={p.id} type="button" className="struct-node" tabIndex={layer === 'struktur' ? 0 : -1} onClick={() => setLayer('divisi')}>
                  <span className="struct-drop" aria-hidden="true" />
                  <Avatar name={p.name} className="av-lg-sq" />
                  <span className="struct-name sm">{p.name}</span>
                  <span className="struct-role">{p.role}</span>
                </button>
              ))}
            </div>
          </>}
          <p className="team-hint">Geser ke kiri atau pilih Divisi untuk melihat tim tiap bidang</p>
        </div>

        {/* layer 2: division stack */}
        <div className={`team-layer div-stack ${layer === 'divisi' ? 'on' : 'off-right'}`} aria-hidden={layer !== 'divisi'}>
          <div className="stack-viewport">
            {divisions.map((d, i) => {
              const rel = mod(i - idx, n);
              const pos = rel === 0 ? 0 : rel === 1 ? 1 : rel === 2 ? 2 : rel === n - 1 ? -1 : 3;
              return (
                <article
                  key={d.name}
                  className={`dcard p${pos} ${pos === 0 ? 'front' : ''}`}
                  aria-hidden={pos !== 0}
                  onClick={() => { if (pos === 1) step(1); }}
                >
                  <header className="dcard-head">
                    {d.head ? <Avatar name={d.head.name} className="av-lg-sq" /> : <span className="av-lg-sq avatar" aria-hidden="true" />}
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div className="dcard-div">Divisi {d.name.toLowerCase()}</div>
                      <div className="dcard-name">{d.head?.name ?? 'Kepala divisi belum ditetapkan'}</div>
                      {d.head && <div className="dcard-role">{d.head.role}</div>}
                    </div>
                    <div className="dcard-count">{i + 1} dari {n}</div>
                  </header>
                  <div className="dcard-inner">
                    <div className="dcard-inner-head"><span>Anggota</span><span>{d.count} orang</span></div>
                    {d.members.length === 0
                      ? <div className="dcard-empty">Belum ada anggota lain di divisi ini</div>
                      : (
                        <ul className="dcard-list" data-lenis-prevent tabIndex={pos === 0 ? 0 : -1}>
                          {d.members.map((m) => (
                            <li key={m.id}>
                              <Avatar name={m.name} />
                              <span className="dcard-m-name">{m.name}</span>
                              <span className="dcard-m-uni">{m.university ?? ''}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                  </div>
                </article>
              );
            })}
          </div>
          <div className="stack-ctrl">
            <button type="button" className="round-btn" tabIndex={layer === 'divisi' ? 0 : -1} onClick={() => step(-1)} aria-label="Divisi sebelumnya"><IconArrow style={{ transform: 'rotate(-90deg)' }} /></button>
            <button type="button" className="round-btn" tabIndex={layer === 'divisi' ? 0 : -1} onClick={() => step(1)} aria-label="Divisi berikutnya"><IconArrow style={{ transform: 'rotate(90deg)' }} /></button>
          </div>
        </div>
      </div>
    </div>
  );
}

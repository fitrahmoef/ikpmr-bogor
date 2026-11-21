'use client';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { SongketBand } from '@/components/brand';
import { IconArrow, IconCalendar, IconPin } from '@/components/icons';
import { Segmented } from './Segmented';
import { Sheet } from './Sheet';

export type DeckEvent = {
  id: string; title: string; place: string; division: string; description: string | null;
  day: string; month: string; year: string; dateLong: string; time: string;
  registered: number; capacity: number;
};

type Tab = 'upcoming' | 'past';
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

// Thin pucuk rebung row woven across a pass, the same thread as the invitation band.
const RebungRow = () => (
  <svg className="pass-rebung" viewBox="0 0 240 16" preserveAspectRatio="none" aria-hidden="true">
    {Array.from({ length: 12 }, (_, i) => (
      <path key={i} d={`M${i * 20 + 2} 15 L${i * 20 + 10} 2 L${i * 20 + 18} 15`} fill="none" stroke="currentColor" strokeWidth="1" />
    ))}
  </svg>
);

export function AgendaDeck({ upcoming, past }: { upcoming: DeckEvent[]; past: DeckEvent[] }) {
  const [tab, setTab] = useState<Tab>(upcoming.length ? 'upcoming' : 'past');
  const [idx, setIdx] = useState(0);
  const [drag, setDrag] = useState(0); // fractional card offset while a finger is down
  const [dragging, setDragging] = useState(false);
  const [open, setOpen] = useState<DeckEvent | null>(null);
  const [view, setView] = useState<'info' | 'invite'>('info');
  const [narrow, setNarrow] = useState(false);
  const start = useRef<{ x: number; moved: boolean } | null>(null);
  const list = tab === 'upcoming' ? upcoming : past;
  const spread = narrow ? 44 : 88;
  // keep the fanned group centred: shift by the imbalance between cards showing left and right
  const pos = idx + drag;
  const shift = -(Math.min(2, list.length - 1 - pos) - Math.min(2, pos)) * spread * 0.5;

  useEffect(() => {
    const m = window.matchMedia('(max-width: 640px)');
    const set = () => setNarrow(m.matches);
    set();
    m.addEventListener('change', set);
    return () => m.removeEventListener('change', set);
  }, []);

  const go = useCallback((i: number) => setIdx(clamp(i, 0, list.length - 1)), [list.length]);
  const switchTab = (t: Tab) => { setTab(t); setIdx(0); };

  const onDown = (e: React.PointerEvent) => {
    start.current = { x: e.clientX, moved: false };
    try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch {}
  };
  const onMove = (e: React.PointerEvent) => {
    if (!start.current) return;
    const dx = e.clientX - start.current.x;
    if (Math.abs(dx) > 6) { start.current.moved = true; setDragging(true); }
    if (start.current.moved) setDrag(clamp(-dx / (spread * 1.3), -idx - 0.4, list.length - 1 - idx + 0.4));
  };
  const onUp = (e: React.PointerEvent) => {
    const s = start.current;
    start.current = null;
    setDragging(false);
    if (!s) return;
    if (s.moved) {
      go(Math.round(idx + drag));
      setDrag(0);
      return;
    }
    // a tap: the centre card opens, a side card comes to the centre
    const el = (document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null)?.closest<HTMLElement>('[data-i]');
    if (!el) return;
    const i = Number(el.dataset.i);
    if (i === idx) { setView('info'); setOpen(list[i]); } else go(i);
  };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); go(idx + 1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); go(idx - 1); }
    if (e.key === 'Enter' && list[idx]) { setView('info'); setOpen(list[idx]); }
  };

  return (
    <div className="deck">
      <Segmented
        label="Saring agenda"
        value={tab}
        onChange={switchTab}
        options={[{ value: 'upcoming', label: 'Akan datang' }, { value: 'past', label: 'Sudah berlangsung' }]}
      />

      <div className="deck-row">
        <button type="button" className="round-btn" onClick={() => go(idx - 1)} disabled={idx === 0} aria-label="Agenda sebelumnya">
          <IconArrow style={{ transform: 'scaleX(-1)' }} />
        </button>

        <div
          className={`deck-stage ${dragging ? 'dragging' : ''}`}
          tabIndex={0}
          role="listbox"
          aria-label={`Agenda ${tab === 'upcoming' ? 'akan datang' : 'sudah berlangsung'}, ${idx + 1} dari ${list.length}`}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={() => { start.current = null; setDragging(false); setDrag(0); }}
          onKeyDown={onKey}
        >
          {list.length === 0 && <div className="empty">Belum ada agenda di sini</div>}
          {list.map((ev, i) => {
            const o = i - idx - drag;
            const a = Math.abs(o);
            const style: React.CSSProperties = {
              transform: `translateX(${o * spread + shift}px) translateY(${Math.min(a, 3) * 10}px) rotate(${o * 5}deg) scale(${1 - Math.min(a, 3) * 0.06})`,
              zIndex: 100 - Math.round(a * 10),
              opacity: a > 2.6 ? 0 : 1 - Math.min(a, 2) * 0.12,
              pointerEvents: a > 2.6 ? 'none' : undefined,
            };
            return (
              <article
                key={ev.id}
                data-i={i}
                role="option"
                aria-selected={i === idx}
                className={`pass ${tab} ${i === idx ? 'front' : ''}`}
                style={style}
              >
                <div className="pass-top">
                  <div className="pass-date">
                    <span className="pass-day">{ev.day}</span>
                    <span className="pass-my">{ev.month}<br />{ev.year}</span>
                  </div>
                  <span className="pass-div">{ev.division}</span>
                </div>
                <RebungRow />
                <h3 className="pass-title">{ev.title}</h3>
                <dl className="pass-rows">
                  <div><dt><IconCalendar /></dt><dd>{ev.time}</dd></div>
                  <div><dt><IconPin /></dt><dd>{ev.place}</dd></div>
                </dl>
                <div className="pass-foot">
                  <span>{tab === 'upcoming' ? `${ev.registered} dari ${ev.capacity} kursi terisi` : 'Selesai'}</span>
                  <span className="pass-more">Detail <IconArrow /></span>
                </div>
              </article>
            );
          })}
        </div>

        <button type="button" className="round-btn" onClick={() => go(idx + 1)} disabled={idx >= list.length - 1} aria-label="Agenda berikutnya">
          <IconArrow />
        </button>
      </div>

      <div className="dots" aria-hidden="true">
        {list.map((ev, i) => <button key={ev.id} tabIndex={-1} className={i === idx ? 'on' : ''} onClick={() => go(i)} />)}
      </div>

      <Sheet open={!!open} onClose={() => setOpen(null)} label={open?.title ?? 'Detail agenda'}>
        {open && (
          <div className="sheet-body">
            <Segmented
              label="Tampilan detail"
              value={view}
              onChange={setView}
              options={[{ value: 'info', label: 'Ringkasan' }, { value: 'invite', label: 'Undangan' }]}
            />
            {view === 'info' ? (
              <div className="sheet-view" key="info">
                <div className="sheet-kicker">{tab === 'upcoming' ? 'Akan datang' : 'Sudah berlangsung'} · Bidang {open.division.toLowerCase()}</div>
                <h3 className="sheet-title">{open.title}</h3>
                {open.description && <p className="sheet-text">{open.description}</p>}
                <dl className="grouped">
                  <div><dt>Tanggal</dt><dd>{open.dateLong}</dd></div>
                  <div><dt>Waktu</dt><dd>{open.time}</dd></div>
                  <div><dt>Tempat</dt><dd>{open.place}</dd></div>
                  <div><dt>Pendaftar</dt><dd>{open.registered} dari {open.capacity}</dd></div>
                </dl>
                {tab === 'upcoming'
                  ? <Link href="/anggota/acara" className="btn btn-primary sheet-cta">Daftar lewat ruang anggota</Link>
                  : <button type="button" className="btn btn-secondary sheet-cta" onClick={() => setOpen(null)}>Tutup</button>}
              </div>
            ) : (
              <div className="sheet-view" key="invite">
                <article className="invite sheet-invite" aria-label={`Undangan ${open.title}`}>
                  <SongketBand id="sheet" />
                  <div className="invite-body">
                    <div className="invite-kicker"><span>Undangan</span><span>Bidang {open.division.toLowerCase()}</span></div>
                    <h4 className="invite-title">{open.title}</h4>
                    <dl className="invite-rows">
                      <div className="invite-row"><dt>Tanggal</dt><dd>{open.dateLong}</dd></div>
                      <div className="invite-row"><dt>Waktu</dt><dd>{open.time}</dd></div>
                      <div className="invite-row"><dt>Tempat</dt><dd>{open.place}</dd></div>
                      <div className="invite-row"><dt>Oleh</dt><dd>IKPMR Bogor</dd></div>
                    </dl>
                  </div>
                </article>
              </div>
            )}
          </div>
        )}
      </Sheet>
    </div>
  );
}

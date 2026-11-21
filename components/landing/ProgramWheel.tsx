'use client';
import { useRef, useState } from 'react';
import { IconAcademic, IconArrow, IconMusic, IconTech, IconUsers } from '@/components/icons';
import { Segmented } from './Segmented';

export type Program = { name: 'Akademik' | 'Sosial' | 'Budaya' | 'Teknologi'; desc: string; coordinator: string | null; members: number };

const ICON = { Akademik: IconAcademic, Sosial: IconUsers, Budaya: IconMusic, Teknologi: IconTech };
const STEP = 90; // four faces around the drum
const mod = (n: number, m: number) => ((n % m) + m) % m;

// A picker wheel: four faces on a drum. Drag it, use the chevrons, the segments or the arrow keys.
// It never turns on its own and never captures the page's scroll wheel.
export function ProgramWheel({ items }: { items: Program[] }) {
  const [step, setStep] = useState(0);
  const [drag, setDrag] = useState(0);
  const start = useRef<number | null>(null);
  const front = mod(step, items.length);

  const roll = (d: number) => setStep((s) => s + d);
  const rollTo = (i: number) => {
    let diff = i - front;
    if (diff > 2) diff -= 4;
    if (diff < -2) diff += 4;
    setStep((s) => s + diff);
  };

  const onDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('a,button')) return;
    start.current = e.clientY;
    try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch {}
  };
  const onMove = (e: React.PointerEvent) => {
    if (start.current === null) return;
    setDrag(Math.max(-1.4, Math.min(1.4, (start.current - e.clientY) / 160)));
  };
  const onUp = () => {
    if (start.current === null) return;
    start.current = null;
    const d = Math.round(drag);
    setDrag(0);
    if (d) roll(d);
  };

  const openTeam = (name: string) => window.dispatchEvent(new CustomEvent('ikpmr-open-division', { detail: name }));

  return (
    <div className="wheel">
      <Segmented
        label="Pilih bidang"
        className="wheel-seg"
        value={items[front].name}
        onChange={(v) => rollTo(items.findIndex((x) => x.name === v))}
        options={items.map((x) => ({ value: x.name, label: x.name }))}
      />
      <div className="wheel-row">
        <div
          className={`wheel-stage ${drag ? 'dragging' : ''}`}
          tabIndex={0}
          role="group"
          aria-roledescription="roda pilihan"
          aria-label={`Bidang ${items[front].name}, ${front + 1} dari ${items.length}`}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={() => { start.current = null; setDrag(0); }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') { e.preventDefault(); roll(1); }
            if (e.key === 'ArrowUp') { e.preventDefault(); roll(-1); }
          }}
        >
          <div className="wheel-rotor" style={{ transform: `rotateX(${(step + drag) * STEP}deg)` }}>
            {items.map((p, i) => {
              const Icon = ICON[p.name];
              const isFront = i === front;
              return (
                <div
                  key={p.name}
                  className={`wheel-face ${isFront ? 'front' : ''}`}
                  style={{ transform: `rotateX(${-i * STEP}deg) translateZ(var(--wheel-r))` }}
                  aria-hidden={!isFront}
                >
                  <div className="wheel-icon"><Icon /></div>
                  <div className="wheel-main">
                    <div className="wheel-num">Bidang {i + 1} dari {items.length}</div>
                    <h3 className="wheel-title">{p.name}</h3>
                    <p className="wheel-desc">{p.desc}</p>
                  </div>
                  <div className="wheel-side">
                    <div className="wheel-meta-label">Koordinator</div>
                    <div className="wheel-meta">{p.coordinator ?? 'Belum ditetapkan'}</div>
                    <div className="wheel-meta-label" style={{ marginTop: 12 }}>Anggota aktif</div>
                    <div className="wheel-meta wheel-count">{p.members}</div>
                    <a href="#members" className="btn btn-secondary btn-xs wheel-link" tabIndex={isFront ? 0 : -1} onClick={() => openTeam(p.name)}>
                      Lihat tim <IconArrow />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="wheel-ctrl">
          <button type="button" className="round-btn" onClick={() => roll(-1)} aria-label="Bidang sebelumnya"><IconArrow style={{ transform: 'rotate(-90deg)' }} /></button>
          <button type="button" className="round-btn" onClick={() => roll(1)} aria-label="Bidang berikutnya"><IconArrow style={{ transform: 'rotate(90deg)' }} /></button>
        </div>
      </div>
    </div>
  );
}

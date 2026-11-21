'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Avatar } from '@/components/brand';
import { Map3D } from '@/components/Map3D';

export type RegencyStat = {
  key: string; name: string; seat: string; lat: number; lng: number;
  members: { id: string; name: string; university: string | null }[];
};

// Member view: the same 3D map as the landing page, plus who is from where.
export function RiauMap({ stats, meId }: { stats: RegencyStat[]; meId: string }) {
  const [selected, setSelected] = useState<string | null>(stats.find((s) => s.members.length)?.key ?? null);
  const counts = Object.fromEntries(stats.map((s) => [s.key, s.members.length]));
  const max = Math.max(1, ...stats.map((s) => s.members.length));
  const sel = stats.find((s) => s.key === selected);

  return (
    <div className="map-layout">
      <div className="panel" style={{ overflow: 'hidden' }}>
        <Map3D counts={counts} selected={selected} onSelect={(k) => k && setSelected(k)} className="map3d-page" />
      </div>
      <div className="panel">
        <div className="panel-head"><div className="panel-title">Asal anggota</div><div className="panel-meta">klik wilayah di peta</div></div>
        <div className="panel-body">
          <div className="rank">
            {stats.map((s, i) => (
              <button key={s.key} className={`rank-row ${i === 0 ? 'lead' : ''} ${s.key === selected ? 'active' : ''}`} onClick={() => setSelected(s.key)}>
                <div className="rank-top"><span>{s.name}</span><span>{s.members.length}</span></div>
                <div className="rank-bar"><span style={{ width: `${(s.members.length / max) * 100}%`, animationDelay: `${i * 40}ms` }} /></div>
              </button>
            ))}
          </div>
          {sel && (
            <div style={{ borderTop: '1px solid var(--line)', marginTop: 16, paddingTop: 16 }}>
              <div className="list-title">{sel.name}</div>
              <div className="cell-sub">Pusat pemerintahan di {sel.seat}</div>
              <div className="people">
                {sel.members.length === 0 && <div className="cell-sub">Belum ada anggota dari sini</div>}
                {sel.members.map((m) => (
                  <div className="person" key={m.id}>
                    <Avatar name={m.name} />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div>{m.name}</div>
                      {m.university && <div className="cell-sub">{m.university}</div>}
                    </div>
                    {m.id !== meId && <Link className="btn btn-ghost btn-xs" href={`/anggota/obrolan?t=${m.id}`}>Pesan</Link>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

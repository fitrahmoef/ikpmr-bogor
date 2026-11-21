import { toggleRegistration } from '@/app/actions/member';
import { dayNum, monthShort, dateLong } from '@/lib/format';
import { IconPin } from '@/components/icons';

type Ev = { id: string; title: string; date: Date; place: string; division: string; capacity: number; _count: { registrations: number } };

export function EventRows({ events, mine, canRegister, past = false }: { events: Ev[]; mine: Set<string>; canRegister: boolean; past?: boolean }) {
  if (!events.length) return <div className="empty">Belum ada acara</div>;
  return (
    <div>
      {events.map((e) => {
        const joined = mine.has(e.id);
        const count = e._count.registrations;
        const full = count >= e.capacity;
        return (
          <div className="event-card-row" key={e.id}>
            <div className="event-date">
              <div className="event-day">{dayNum(e.date)}</div>
              <div className="event-month">{monthShort(e.date)}</div>
            </div>
            <div style={{ minWidth: 0 }}>
              <div className="event-title">{e.title}</div>
              <div className="event-meta"><IconPin />{e.place}</div>
              <div className="cell-sub" style={{ marginTop: 4 }}>{dateLong(e.date)} · {e.division}</div>
              {!past && (
                <>
                  <div className="capacity" aria-hidden="true"><span style={{ width: `${Math.min(100, (count / e.capacity) * 100)}%` }} /></div>
                  <div className="cell-sub" style={{ marginTop: 4, fontVariantNumeric: 'tabular-nums' }}>{count} dari {e.capacity} kursi terisi</div>
                </>
              )}
            </div>
            <div>
              {past
                ? <span className={`status ${joined ? 'ok' : ''}`}>{joined ? 'Kamu hadir' : 'Selesai'}</span>
                : canRegister && (
                  <form action={toggleRegistration}>
                    <input type="hidden" name="eventId" value={e.id} />
                    {joined
                      ? <button className="btn btn-secondary btn-xs">Batal ikut</button>
                      : <button className="btn btn-primary btn-xs" disabled={full}>{full ? 'Penuh' : 'Ikut'}</button>}
                  </form>
                )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function PendingNotice() {
  return (
    <div className="panel" style={{ marginBottom: 16 }}>
      <div className="panel-body" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <span className="status wait" />
        <div>
          <div className="list-title">Akun kamu menunggu persetujuan pengurus</div>
          <div className="list-body">Sementara itu kamu bisa melengkapi profil. Pendaftaran acara, obrolan, dan peta terbuka setelah disetujui.</div>
        </div>
      </div>
    </div>
  );
}

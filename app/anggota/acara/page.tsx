import { prisma } from '@/lib/prisma';
import { liveUser } from '@/lib/guard';
import { EventRows, PendingNotice } from '@/components/app/EventRows';

export const metadata = { title: 'Acara' };

export default async function Page() {
  const u = (await liveUser())!;
  const active = u.status === 'ACTIVE' || u.role === 'ADMIN';
  const now = new Date();
  const inc = { _count: { select: { registrations: true } } } as const;
  const [upcoming, past, mine] = await Promise.all([
    prisma.event.findMany({ where: { date: { gte: now } }, orderBy: { date: 'asc' }, include: inc }),
    prisma.event.findMany({ where: { date: { lt: now } }, orderBy: { date: 'desc' }, take: 12, include: inc }),
    prisma.eventRegistration.findMany({ where: { userId: u.id }, select: { eventId: true } }),
  ]);
  const set = new Set(mine.map((m) => m.eventId));
  const joined = upcoming.filter((e) => set.has(e.id)).length;

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">Acara</h1>
          <p className="page-sub">{joined ? `Kamu terdaftar di ${joined} dari ${upcoming.length} acara mendatang` : 'Daftar ke acara yang ingin kamu ikuti'}</p>
        </div>
      </div>
      {!active && <PendingNotice />}
      <div className="stack">
        <div className="panel">
          <div className="panel-head"><div className="panel-title">Akan datang</div><div className="panel-meta">{upcoming.length} acara</div></div>
          <div className="panel-body"><EventRows events={upcoming} mine={set} canRegister={active} /></div>
        </div>
        <div className="panel">
          <div className="panel-head"><div className="panel-title">Sudah berlangsung</div></div>
          <div className="panel-body"><EventRows events={past} mine={set} canRegister={false} past /></div>
        </div>
      </div>
    </>
  );
}

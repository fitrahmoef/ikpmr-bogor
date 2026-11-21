import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { liveUser } from '@/lib/guard';
import { relative } from '@/lib/format';
import { EventRows, PendingNotice } from '@/components/app/EventRows';
import { IconArrow } from '@/components/icons';

export const metadata = { title: 'Beranda anggota' };
const PRIORITY: Record<string, string> = { HIGH: 'Penting', MEDIUM: 'Info', LOW: 'Catatan' };

export default async function Page() {
  const u = (await liveUser())!;
  const active = u.status === 'ACTIVE' || u.role === 'ADMIN';
  const [announcements, events, mine] = await Promise.all([
    prisma.announcement.findMany({ orderBy: { createdAt: 'desc' }, take: 6, include: { author: { select: { name: true, position: true } } } }),
    prisma.event.findMany({ where: { date: { gte: new Date() } }, orderBy: { date: 'asc' }, take: 3, include: { _count: { select: { registrations: true } } } }),
    prisma.eventRegistration.findMany({ where: { userId: u.id }, select: { eventId: true } }),
  ]);
  const month = new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' });

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">{month}</h1>
          <p className="page-sub">Pengumuman pengurus dan acara terdekat</p>
        </div>
      </div>
      {!active && <PendingNotice />}
      <div className="grid-2">
        <div className="panel">
          <div className="panel-head"><div className="panel-title">Pengumuman</div><div className="panel-meta">{announcements.length} terbaru</div></div>
          <div className="panel-body">
            {announcements.length === 0 && <div className="empty">Belum ada pengumuman</div>}
            {announcements.map((a) => (
              <article className="list-item" key={a.id}>
                <div className="list-meta">
                  <span className={`status ${a.priority === 'HIGH' ? 'wait' : ''}`}>{PRIORITY[a.priority]}</span>
                  <span>{relative(a.createdAt)}</span>
                  {a.author && <span>{a.author.position ?? a.author.name}</span>}
                </div>
                <h2 className="list-title">{a.title}</h2>
                <p className="list-body">{a.body}</p>
              </article>
            ))}
          </div>
        </div>
        <div className="panel">
          <div className="panel-head">
            <div className="panel-title">Acara terdekat</div>
            <Link href="/anggota/acara" className="btn btn-ghost btn-xs">Semua <IconArrow /></Link>
          </div>
          <div className="panel-body">
            <EventRows events={events} mine={new Set(mine.map((m) => m.eventId))} canRegister={active} />
          </div>
        </div>
      </div>
    </>
  );
}

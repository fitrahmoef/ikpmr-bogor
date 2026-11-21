import { prisma } from '@/lib/prisma';
import { liveUser } from '@/lib/guard';
import { REGENCIES } from '@/lib/riau';
import { PendingNotice } from '@/components/app/EventRows';
import { RiauMap, type RegencyStat } from '@/components/app/RiauMap';

export const metadata = { title: 'Peta anggota' };

export default async function Page() {
  const u = (await liveUser())!;
  const active = u.status === 'ACTIVE' || u.role === 'ADMIN';
  if (!active) {
    return (
      <>
        <div className="page-head"><div><h1 className="page-title">Peta anggota</h1></div></div>
        <PendingNotice />
      </>
    );
  }
  const members = await prisma.user.findMany({
    where: { status: 'ACTIVE', regency: { not: null } },
    select: { id: true, name: true, university: true, regency: true },
    orderBy: { name: 'asc' },
  });
  const stats: RegencyStat[] = REGENCIES.map((r) => ({
    ...r,
    members: members.filter((m) => m.regency === r.key).map((m) => ({ id: m.id, name: m.name, university: m.university })),
  })).sort((a, b) => b.members.length - a.members.length);
  const covered = stats.filter((s) => s.members.length).length;

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">Peta anggota</h1>
          <p className="page-sub">{members.length} anggota aktif dari {covered === REGENCIES.length ? `semua ${covered}` : `${covered} dari ${REGENCIES.length}`} kabupaten dan kota di Riau</p>
        </div>
      </div>
      <RiauMap stats={stats} meId={u.id} />
    </>
  );
}

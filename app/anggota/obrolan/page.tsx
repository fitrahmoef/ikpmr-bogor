import { prisma } from '@/lib/prisma';
import { liveUser } from '@/lib/guard';
import { PendingNotice } from '@/components/app/EventRows';
import { Chat } from '@/components/app/Chat';
import { regencyName } from '@/lib/riau';

export const metadata = { title: 'Obrolan' };

export default async function Page({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const u = (await liveUser())!;
  const active = u.status === 'ACTIVE' || u.role === 'ADMIN';
  const { t } = await searchParams;

  if (!active) {
    return (
      <>
        <div className="page-head"><div><h1 className="page-title">Obrolan</h1></div></div>
        <PendingNotice />
      </>
    );
  }

  const [people, recent] = await Promise.all([
    prisma.user.findMany({
      where: { status: 'ACTIVE', id: { not: u.id } },
      select: { id: true, name: true, position: true, regency: true },
      orderBy: { name: 'asc' },
    }),
    // latest personal message per counterpart, to order threads by recent activity
    prisma.chatMessage.findMany({
      where: { OR: [{ senderId: u.id, recipientId: { not: null } }, { recipientId: u.id }] },
      orderBy: { createdAt: 'desc' },
      take: 200,
      select: { senderId: true, recipientId: true, body: true, fileName: true, createdAt: true },
    }),
  ]);

  const last = new Map<string, { body: string; at: string }>();
  for (const m of recent) {
    const other = m.senderId === u.id ? m.recipientId! : m.senderId;
    if (!last.has(other)) last.set(other, { body: m.body || (m.fileName ? `File: ${m.fileName}` : ''), at: m.createdAt.toISOString() });
  }
  const threads = people
    .map((p) => ({ id: p.id, name: p.name, sub: last.get(p.id)?.body ?? p.position ?? regencyName(p.regency), at: last.get(p.id)?.at ?? null }))
    .sort((a, b) => (b.at ?? '').localeCompare(a.at ?? '') || a.name.localeCompare(b.name));

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">Obrolan</h1>
          <p className="page-sub">Grup semua anggota dan pesan pribadi</p>
        </div>
      </div>
      <Chat me={{ id: u.id, name: u.name }} threads={threads} initial={t && threads.some((x) => x.id === t) ? t : 'group'} />
    </>
  );
}

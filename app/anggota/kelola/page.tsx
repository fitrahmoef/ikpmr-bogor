import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { rupiah, relative } from '@/lib/format';
import { DIVISIONS } from '@/lib/riau';
import { CashChart, sixMonths } from '@/components/app/CashChart';
import { IconArrow } from '@/components/icons';

export const metadata = { title: 'Ringkasan' };

export default async function Page() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const sixAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  const [active, pending, newThisMonth, newLastMonth, upcoming, txAll, txRecent, byDivision, messages] = await Promise.all([
    prisma.user.count({ where: { status: 'ACTIVE' } }),
    prisma.user.count({ where: { status: 'PENDING' } }),
    prisma.user.count({ where: { createdAt: { gte: monthStart } } }),
    prisma.user.count({ where: { createdAt: { gte: lastMonthStart, lt: monthStart } } }),
    prisma.event.findMany({ where: { date: { gte: now } }, orderBy: { date: 'asc' }, include: { _count: { select: { registrations: true } } } }),
    prisma.transaction.groupBy({ by: ['type'], _sum: { amount: true } }),
    prisma.transaction.findMany({ where: { date: { gte: sixAgo } }, select: { type: true, amount: true, date: true } }),
    prisma.user.groupBy({ by: ['division'], where: { status: 'ACTIVE' }, _count: true }),
    prisma.contactMessage.findMany({ orderBy: { createdAt: 'desc' }, take: 4 }),
  ]);

  const sum = (t: 'IN' | 'OUT') => txAll.find((x) => x.type === t)?._sum.amount ?? 0;
  const balance = sum('IN') - sum('OUT');
  const flows = sixMonths(txRecent, now);
  const cur = flows[flows.length - 1], prev = flows[flows.length - 2];
  const net = cur.in - cur.out, prevNet = prev.in - prev.out;
  const divisions = DIVISIONS.map((d) => ({ d, n: byDivision.find((x) => x.division === d)?._count ?? 0 })).sort((a, b) => b.n - a.n);
  const maxDiv = Math.max(1, ...divisions.map((x) => x.n));
  const memberDelta = newThisMonth - newLastMonth;

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">Ringkasan</h1>
          <p className="page-sub">{now.toLocaleDateString('id-ID', { month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' })}</p>
        </div>
      </div>

      <div className="stats">
        <div className="panel stat">
          <div className="stat-label">Anggota aktif</div>
          <div className="stat-value">{active}</div>
          <div className="stat-delta">{newThisMonth} pendaftar bulan ini, {memberDelta >= 0 ? `${memberDelta} lebih banyak` : `${-memberDelta} lebih sedikit`} dari bulan lalu</div>
        </div>
        <Link href="/anggota/kelola/anggota?f=pending" className="panel stat" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="stat-label">Menunggu persetujuan</div>
          <div className="stat-value">{pending}</div>
          <div className="stat-delta">{pending ? 'Periksa pendaftar baru' : 'Tidak ada antrean'}</div>
        </Link>
        <div className="panel stat">
          <div className="stat-label">Acara mendatang</div>
          <div className="stat-value">{upcoming.length}</div>
          <div className="stat-delta">{upcoming.reduce((s, e) => s + e._count.registrations, 0)} pendaftaran</div>
        </div>
        <div className="panel stat stat-wide">
          <div className="stat-label">Saldo kas</div>
          <div className="stat-value" style={{ fontSize: 28 }}>{rupiah(balance)}</div>
          <div className="stat-delta">
            Bulan ini <span className={net >= 0 ? 'up' : 'down'}>{net >= 0 ? '+' : '−'}{rupiah(Math.abs(net))}</span> vs {prevNet >= 0 ? '+' : '−'}{rupiah(Math.abs(prevNet))} bulan lalu
          </div>
        </div>
      </div>

      <div className="grid-2" style={{ marginBottom: 16 }}>
        <div className="panel">
          <div className="panel-head">
            <div className="panel-title">Arus kas enam bulan</div>
            <div className="cash-legend">
              <span><i style={{ background: 'var(--accent)' }} />Masuk</span>
              <span><i style={{ background: 'var(--accent)', opacity: 0.45 }} />Keluar</span>
            </div>
          </div>
          <div className="panel-body chart-scroll"><CashChart data={flows} /></div>
        </div>
        <div className="panel">
          <div className="panel-head"><div className="panel-title">Anggota per divisi</div></div>
          <div className="panel-body">
            <div className="rank">
              {divisions.map((x, i) => (
                <div key={x.d} className={`rank-row ${i === 0 ? 'lead' : ''}`} style={{ cursor: 'default' }}>
                  <div className="rank-top"><span>{x.d}</span><span>{x.n}</span></div>
                  <div className="rank-bar"><span style={{ width: `${(x.n / maxDiv) * 100}%`, animationDelay: `${i * 40}ms` }} /></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid-even">
        <div className="panel">
          <div className="panel-head"><div className="panel-title">Acara mendatang</div><Link href="/anggota/kelola/acara" className="btn btn-ghost btn-xs">Kelola <IconArrow /></Link></div>
          <div className="panel-body">
            {upcoming.length === 0 && <div className="empty">Belum ada acara</div>}
            {upcoming.slice(0, 4).map((e) => (
              <div className="list-item" key={e.id}>
                <div className="list-title">{e.title}</div>
                <div className="list-meta"><span>{e.date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', timeZone: 'Asia/Jakarta' })}</span><span style={{ fontVariantNumeric: 'tabular-nums' }}>{e._count.registrations} dari {e.capacity} kursi</span></div>
              </div>
            ))}
          </div>
        </div>
        <div className="panel">
          <div className="panel-head"><div className="panel-title">Pesan masuk</div><Link href="/anggota/kelola/pesan" className="btn btn-ghost btn-xs">Semua <IconArrow /></Link></div>
          <div className="panel-body">
            {messages.map((m) => (
              <div className="list-item" key={m.id}>
                <div className="list-meta">{!m.read && <span className="unread-dot" aria-label="Belum dibaca" />}<span>{m.name}</span><span>{relative(m.createdAt)}</span></div>
                <div className="list-body" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.message}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

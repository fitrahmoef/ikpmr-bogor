import Link from 'next/link';
import type { Prisma } from '@prisma/client';
import { STATUS_LABEL } from '@/lib/shop';
import { prisma } from '@/lib/prisma';
import { dateMed, rupiah, time } from '@/lib/format';
import { ConfirmButton } from '@/components/app/ConfirmButton';
import { setOrderStatus, toggleCheckIn } from '@/app/actions/shop';

export const metadata = { title: 'Pesanan' };

const TABS: { id: string; label: string; where: Prisma.OrderWhereInput }[] = [
  { id: 'periksa', label: 'Perlu diperiksa', where: { status: 'REVIEW' } },
  { id: 'menunggu', label: 'Belum bayar', where: { status: 'PENDING' } },
  { id: 'lunas', label: 'Lunas', where: { status: 'PAID' } },
  { id: 'batal', label: 'Ditolak dan batal', where: { status: { in: ['REJECTED', 'CANCELLED'] } } },
];
const wa = (p: string) => `https://wa.me/${p.replace(/\D/g, '').replace(/^0/, '62')}`;

export default async function Page({ searchParams }: { searchParams: Promise<{ s?: string; q?: string }> }) {
  const { s = 'periksa', q = '' } = await searchParams;
  const tab = TABS.find((t) => t.id === s) ?? TABS[0];
  const query = q.trim();
  const where: Prisma.OrderWhereInput = query
    ? { OR: [{ code: { contains: query.toUpperCase() } }, { buyerName: { contains: query, mode: 'insensitive' } }, { buyerEmail: { contains: query.toLowerCase() } }] }
    : tab.where;
  const [orders, counts] = await Promise.all([
    prisma.order.findMany({ where, orderBy: { createdAt: 'desc' }, take: 100, include: { items: true } }),
    Promise.all(TABS.map((t) => prisma.order.count({ where: t.where }))),
  ]);

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">Pesanan</h1>
          <p className="page-sub">Tiket dan merch. Pesanan yang diterima otomatis tercatat sebagai pemasukan di Kas</p>
        </div>
      </div>
      <div className="toolbar">
        <nav className="segmented" aria-label="Status">
          {TABS.map((t, i) => (
            <Link key={t.id} href={`?s=${t.id}`} className={!query && t.id === tab.id ? 'active' : ''}>{t.label} <span className="seg-count">{counts[i]}</span></Link>
          ))}
        </nav>
        <form className="toolbar-search">
          <input name="q" defaultValue={query} className="form-input" placeholder="Kode, nama, atau email" aria-label="Cari pesanan" />
        </form>
      </div>

      {orders.length === 0
        ? <div className="panel"><div className="empty">{query ? 'Tidak ada pesanan yang cocok' : 'Tidak ada pesanan di sini'}</div></div>
        : (
          <div className="order-list">
            {orders.map((o) => {
              const [label, tone] = STATUS_LABEL[o.status];
              const open = o.status === 'PENDING' || o.status === 'REVIEW';
              return (
                <article className="panel order-card" key={o.id}>
                  <div className="order-top">
                    <div>
                      <div className="order-code">{o.code}</div>
                      <div className="cell-sub">{o.kind === 'TICKET' ? 'Tiket' : 'Merch'} · {dateMed(o.createdAt)} {time(o.createdAt)}</div>
                    </div>
                    <span className={`status ${tone}`}>{label}{o.status === 'PAID' && o.kind === 'TICKET' && o.checkedIn ? ', sudah hadir' : ''}</span>
                  </div>
                  <div className="order-body">
                    <div>
                      <div>{o.buyerName}</div>
                      <div className="cell-sub">{o.buyerEmail} · <a href={wa(o.buyerPhone)} target="_blank" rel="noreferrer">{o.buyerPhone}</a></div>
                      <ul className="order-items">
                        {o.items.map((i) => <li key={i.id}><span>{i.name}{i.variant ? ` · ${i.variant}` : ''} × {i.qty}</span><span className="num">{rupiah(i.unitPrice * i.qty)}</span></li>)}
                        <li className="order-total"><span>Total</span><span className="num">{rupiah(o.total)}</span></li>
                      </ul>
                      {o.note && <div className="cell-sub">Catatan: {o.note}</div>}
                    </div>
                    {o.proofUrl
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <a href={o.proofUrl} target="_blank" rel="noreferrer" className="proof-thumb" title="Buka bukti transfer"><img src={o.proofUrl} alt="Bukti transfer" /></a>
                      : <div className="proof-thumb empty-thumb">Belum ada bukti</div>}
                  </div>
                  {open && (
                    <div className="order-actions">
                      <form action={setOrderStatus}>
                        <input type="hidden" name="id" value={o.id} /><input type="hidden" name="status" value="PAID" />
                        <ConfirmButton className="btn btn-primary btn-xs" message={`Terima pembayaran ${o.code} sebesar ${rupiah(o.total)}? Pemasukan dicatat di Kas.`}>Terima pembayaran</ConfirmButton>
                      </form>
                      <form action={setOrderStatus} className="reject-form">
                        <input type="hidden" name="id" value={o.id} /><input type="hidden" name="status" value={o.proofUrl ? 'REJECTED' : 'CANCELLED'} />
                        <input name="note" className="form-input" placeholder={o.proofUrl ? 'Alasan ditolak' : 'Alasan dibatalkan'} aria-label="Alasan" />
                        <ConfirmButton message={`${o.proofUrl ? 'Tolak' : 'Batalkan'} ${o.code}? Stok atau tiketnya dikembalikan.`}>{o.proofUrl ? 'Tolak' : 'Batalkan'}</ConfirmButton>
                      </form>
                    </div>
                  )}
                  {o.status === 'PAID' && o.kind === 'TICKET' && (
                    <div className="order-actions">
                      <form action={toggleCheckIn}>
                        <input type="hidden" name="id" value={o.id} /><input type="hidden" name="checkedIn" value={o.checkedIn ? '0' : '1'} />
                        <button className={`btn btn-xs ${o.checkedIn ? 'btn-ghost' : 'btn-secondary'}`}>{o.checkedIn ? 'Batalkan kehadiran' : 'Tandai hadir'}</button>
                      </form>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
    </>
  );
}

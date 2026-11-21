import { prisma } from '@/lib/prisma';
import { dateMed, rupiah } from '@/lib/format';
import { CashChart, sixMonths } from '@/components/app/CashChart';
import { TransactionForm } from '@/components/app/AdminForms';
import { ConfirmButton } from '@/components/app/ConfirmButton';
import { deleteTransaction } from '@/app/actions/admin';

export const metadata = { title: 'Kas' };

export default async function Page() {
  const now = new Date();
  const [all, recent] = await Promise.all([
    prisma.transaction.findMany({ orderBy: { date: 'desc' }, include: { recordedBy: { select: { name: true } } } }),
    prisma.transaction.findMany({ where: { date: { gte: new Date(now.getFullYear(), now.getMonth() - 5, 1) } }, select: { type: true, amount: true, date: true } }),
  ]);
  const totalIn = all.filter((t) => t.type === 'IN').reduce((s, t) => s + t.amount, 0);
  const totalOut = all.filter((t) => t.type === 'OUT').reduce((s, t) => s + t.amount, 0);
  const flows = sixMonths(recent, now);
  const cur = flows[flows.length - 1];

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">Kas</h1>
          <p className="page-sub">Pemasukan dan pengeluaran organisasi</p>
        </div>
      </div>
      <div className="stats" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
        <div className="panel stat stat-wide"><div className="stat-label">Saldo</div><div className="stat-value">{rupiah(totalIn - totalOut)}</div><div className="stat-delta">dari {all.length} transaksi tercatat</div></div>
        <div className="panel stat"><div className="stat-label">Masuk bulan ini</div><div className="stat-value">{rupiah(cur.in)}</div><div className="stat-delta">{rupiah(flows[4].in)} bulan lalu</div></div>
        <div className="panel stat"><div className="stat-label">Keluar bulan ini</div><div className="stat-value">{rupiah(cur.out)}</div><div className="stat-delta">{rupiah(flows[4].out)} bulan lalu</div></div>
      </div>
      <div className="panel" style={{ marginBottom: 16 }}>
        <div className="panel-head">
          <div className="panel-title">Enam bulan terakhir</div>
          <div className="cash-legend">
            <span><i style={{ background: 'var(--accent)' }} />Masuk</span>
            <span><i style={{ background: 'var(--accent)', opacity: 0.45 }} />Keluar</span>
          </div>
        </div>
        <div className="panel-body chart-scroll"><CashChart data={flows} height={280} /></div>
        <TransactionForm />
      </div>
      <div className="panel table-wrap">
        <table className="table stack">
          <thead><tr><th>Tanggal</th><th>Keterangan</th><th>Dicatat oleh</th><th className="num">Masuk</th><th className="num">Keluar</th><th className="num">Tindakan</th></tr></thead>
          <tbody>
            {all.map((t) => (
              <tr key={t.id}>
                <td className="muted" data-label="Tanggal" style={{ whiteSpace: 'nowrap' }}>{dateMed(t.date)}</td>
                <td>{t.description}</td>
                <td className="muted" data-label="Dicatat oleh">{t.recordedBy?.name ?? '—'}</td>
                <td className="num" data-label="Masuk">{t.type === 'IN' ? rupiah(t.amount) : ''}</td>
                <td className="num muted" data-label="Keluar">{t.type === 'OUT' ? rupiah(t.amount) : ''}</td>
                <td className="cell-actions">
                  <form action={deleteTransaction} className="row-actions">
                    <input type="hidden" name="id" value={t.id} />
                    <ConfirmButton message={`Hapus transaksi "${t.description}" sebesar ${rupiah(t.amount)}?`}>Hapus</ConfirmButton>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

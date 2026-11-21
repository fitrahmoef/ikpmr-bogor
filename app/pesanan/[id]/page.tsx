import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getContent } from '@/lib/content';
import { dateLong, rupiah, time } from '@/lib/format';
import { STATUS_LABEL } from '@/lib/shop';
import { ShopHeader } from '@/components/shop/ShopHeader';
import { ProofForm } from '@/components/shop/ShopForms';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Pesanan', robots: { index: false } };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [order, c] = await Promise.all([
    prisma.order.findUnique({ where: { id }, include: { items: { include: { event: true } } } }),
    getContent(),
  ]);
  if (!order) notFound();
  const [label, tone] = STATUS_LABEL[order.status];
  const open = order.status === 'PENDING' || order.status === 'REVIEW';
  const ev = order.items[0]?.event;
  const qris = c('pay.qris');

  return (
    <>
      <ShopHeader back={{ href: '/toko', label: 'Ke toko' }} />
      <main className="shop-page">
        <div className="shop-inner narrow">
          <div className="order-head">
            <div>
              <div className="buy-kind">Pesanan</div>
              <h1 className="order-code-big">{order.code}</h1>
            </div>
            <span className={`status ${tone}`}>{label}</span>
          </div>
          <p className="cell-sub" style={{ marginBottom: 24 }}>Simpan halaman ini atau catat kodenya. Kamu bisa membukanya lagi dari <Link href="/pesanan">Cek pesanan</Link>.</p>

          {order.status === 'PAID' && order.kind === 'TICKET' && ev && (
            <div className="eticket">
              <div className="eticket-main">
                <div className="buy-kind">E-tiket</div>
                <div className="eticket-title">{ev.title}</div>
                <div className="buy-line">{dateLong(ev.date)}, {time(ev.date)} WIB</div>
                <div className="buy-line">{ev.place}</div>
                <div className="buy-line">{order.buyerName} · {order.items[0].qty} orang</div>
              </div>
              <div className="eticket-stub">
                <span className="eticket-code">{order.code}</span>
                <span className="cell-sub">{order.checkedIn ? 'Sudah hadir' : 'Tunjukkan di pintu masuk'}</span>
              </div>
            </div>
          )}

          <div className="panel order-summary">
            <ul className="order-items">
              {order.items.map((i) => <li key={i.id}><span>{i.name}{i.variant ? ` · ${i.variant}` : ''} × {i.qty}</span><span className="num">{rupiah(i.unitPrice * i.qty)}</span></li>)}
              <li className="order-total"><span>Total</span><span className="num">{rupiah(order.total)}</span></li>
            </ul>
            <div className="cell-sub">{order.buyerName} · {order.buyerEmail} · {order.buyerPhone}</div>
            {order.note && <div className="form-note" style={{ marginTop: 12, marginBottom: 0 }}>Catatan pengurus: {order.note}</div>}
          </div>

          {open && (
            <div className="panel pay-panel">
              <div className="panel-title">Cara membayar</div>
              <div className="pay-grid">
                <dl className="pay-account">
                  <div><dt>Bank</dt><dd>{c('pay.bank')}</dd></div>
                  <div><dt>Nomor rekening</dt><dd className="mono">{c('pay.number')}</dd></div>
                  <div><dt>Atas nama</dt><dd>{c('pay.holder')}</dd></div>
                  <div><dt>Jumlah</dt><dd className="mono">{rupiah(order.total)}</dd></div>
                  <div><dt>Berita transfer</dt><dd className="mono">{order.code}</dd></div>
                </dl>
                {qris && (
                  <figure className="pay-qris">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={qris} alt="QRIS IKPMR Bogor" />
                    <figcaption className="cell-sub">Atau pindai QRIS</figcaption>
                  </figure>
                )}
              </div>
              <p className="buy-desc">{c('pay.instructions')}</p>
              {order.status === 'REVIEW' && <div className="form-note">Bukti sudah diterima dan sedang diperiksa pengurus.</div>}
              <ProofForm id={order.id} hasProof={!!order.proofUrl} />
            </div>
          )}
        </div>
      </main>
    </>
  );
}

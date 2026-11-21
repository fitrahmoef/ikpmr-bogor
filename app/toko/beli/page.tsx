import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { liveUser } from '@/lib/guard';
import { dateLong, rupiah, time } from '@/lib/format';
import { ShopHeader } from '@/components/shop/ShopHeader';
import { CheckoutForm } from '@/components/shop/ShopForms';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Pesan' };

type View = { kind: 'ticket' | 'merch'; id: string; name: string; price: number; left: number; variants: string[]; imageUrl: string | null; lines: string[]; desc: string | null };

async function load(tiket?: string, merch?: string): Promise<View | null> {
  if (tiket) {
    const e = await prisma.event.findUnique({ where: { id: tiket } });
    if (!e || e.ticketPrice <= 0) return null;
    return {
      kind: 'ticket', id: e.id, name: e.title, price: e.ticketPrice, left: e.date < new Date() ? 0 : e.ticketQuota ?? 0, variants: [], imageUrl: e.imageUrl,
      lines: [`${dateLong(e.date)}, ${time(e.date)} WIB`, e.place], desc: e.description,
    };
  }
  if (merch) {
    const p = await prisma.product.findUnique({ where: { id: merch } });
    if (!p || !p.active) return null;
    return {
      kind: 'merch', id: p.id, name: p.name, price: p.price, left: p.stock, imageUrl: p.imageUrl,
      variants: (p.variants ?? '').split(',').map((v) => v.trim()).filter(Boolean), lines: [], desc: p.description,
    };
  }
  return null;
}

export default async function Page({ searchParams }: { searchParams: Promise<{ tiket?: string; merch?: string }> }) {
  const { tiket, merch } = await searchParams;
  const view = await load(tiket, merch);
  if (!view) notFound();
  const me = await liveUser();
  const buyer = { name: me?.name ?? '', email: me?.email ?? '', phone: me?.phone ?? '' };

  return (
    <>
      <ShopHeader back={{ href: '/toko', label: 'Kembali ke toko' }} />
      <main className="shop-page">
        <div className="shop-inner buy-grid">
          <div className="buy-item">
            <div className={`buy-photo ${view.kind}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {view.imageUrl ? <img src={view.imageUrl} alt="" /> : <span className="merch-initial" aria-hidden="true">{view.name.slice(0, 1)}</span>}
            </div>
            <div className="buy-kind">{view.kind === 'ticket' ? 'Tiket acara' : 'Merch'}</div>
            <h1 className="buy-title">{view.name}</h1>
            {view.lines.map((l) => <div key={l} className="buy-line">{l}</div>)}
            <div className="buy-price">{rupiah(view.price)} <span className="cell-sub">{view.kind === 'ticket' ? 'per tiket' : 'per barang'}</span></div>
            {view.desc && <p className="buy-desc">{view.desc}</p>}
          </div>
          <div className="buy-panel">
            {view.left > 0
              ? <CheckoutForm kind={view.kind} item={view.id} price={view.price} max={view.left} variants={view.variants} buyer={buyer} />
              : <div className="shop-empty">{view.kind === 'ticket' ? 'Tiket untuk acara ini sudah habis atau penjualannya sudah ditutup.' : 'Stok sedang habis.'}</div>}
          </div>
        </div>
      </main>
    </>
  );
}

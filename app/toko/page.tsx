import { getContent } from '@/lib/content';
import { shopItems } from '@/lib/shopQueries';
import { ShopHeader } from '@/components/shop/ShopHeader';
import { MerchCard, TicketCard } from '@/components/shop/ShopItems';
import Link from 'next/link';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Toko' };

export default async function Page() {
  const [c, { tickets, merch }] = await Promise.all([getContent(), shopItems()]);
  return (
    <>
      <ShopHeader />
      <main className="shop-page">
        <div className="shop-inner">
          <header className="shop-head">
            <h1 className="shop-title">{c('shop.title')}</h1>
            <p className="section-desc">{c('shop.desc')}</p>
            <Link href="/pesanan" className="shop-link">Sudah memesan? Cek pesanan</Link>
          </header>

          <div className="shop-block" role="region" aria-labelledby="h-tiket">
            <h2 id="h-tiket" className="shop-block-title">Tiket acara</h2>
            {tickets.length
              ? <div className="ticket-grid">{tickets.map((t) => <TicketCard key={t.id} t={t} />)}</div>
              : <p className="shop-empty">Belum ada tiket yang dijual. Acara gratis bisa didaftari dari ruang anggota.</p>}
          </div>

          <div className="shop-block" role="region" aria-labelledby="h-merch">
            <h2 id="h-merch" className="shop-block-title">Merch</h2>
            {merch.length
              ? <div className="merch-grid">{merch.map((m) => <MerchCard key={m.id} m={m} />)}</div>
              : <p className="shop-empty">Merch belum tersedia.</p>}
          </div>
        </div>
      </main>
    </>
  );
}

import Link from 'next/link';
import { dayNum, monthShort, rupiah, time } from '@/lib/format';

export type TicketItem = { id: string; title: string; date: Date; place: string; price: number; left: number; imageUrl: string | null };
export type MerchItem = { id: string; name: string; price: number; stock: number; variants: string | null; imageUrl: string | null };

// A ticket reads as a ticket: date stub on the left, a perforated edge, the event on the right.
export function TicketCard({ t }: { t: TicketItem }) {
  const out = t.left <= 0;
  return (
    <Link href={`/toko/beli?tiket=${t.id}`} className={`ticket-card ${out ? 'out' : ''}`} aria-disabled={out || undefined}>
      <div className="ticket-stub">
        <span className="ticket-day">{dayNum(t.date)}</span>
        <span className="ticket-month">{monthShort(t.date)}</span>
      </div>
      <div className="ticket-main">
        <div className="ticket-title">{t.title}</div>
        <div className="ticket-meta">{t.place} · {time(t.date)} WIB</div>
        <div className="ticket-foot">
          <span className="ticket-price">{rupiah(t.price)}</span>
          <span className="ticket-left">{out ? 'Habis' : t.left <= 20 ? `Sisa ${t.left}` : 'Tersedia'}</span>
        </div>
      </div>
    </Link>
  );
}

export function MerchCard({ m }: { m: MerchItem }) {
  const out = m.stock <= 0;
  return (
    <Link href={`/toko/beli?merch=${m.id}`} className={`merch-card ${out ? 'out' : ''}`} aria-disabled={out || undefined}>
      <div className="merch-photo">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {m.imageUrl ? <img src={m.imageUrl} alt="" loading="lazy" /> : <span className="merch-initial" aria-hidden="true">{m.name.slice(0, 1)}</span>}
      </div>
      <div className="merch-name">{m.name}</div>
      <div className="merch-meta">
        <span className="merch-price">{rupiah(m.price)}</span>
        <span className="cell-sub">{out ? 'Stok habis' : m.variants ? m.variants.split(',').join(' · ') : `Stok ${m.stock}`}</span>
      </div>
    </Link>
  );
}

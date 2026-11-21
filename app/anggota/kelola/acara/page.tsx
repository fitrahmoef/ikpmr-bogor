import { prisma } from '@/lib/prisma';
import { dateMed, rupiah } from '@/lib/format';
import { EventForm } from '@/components/app/AdminForms';
import { ConfirmButton } from '@/components/app/ConfirmButton';
import { deleteEvent } from '@/app/actions/admin';

export const metadata = { title: 'Kelola acara' };

export default async function Page() {
  const now = new Date();
  const events = await prisma.event.findMany({
    orderBy: { date: 'desc' },
    include: {
      _count: { select: { registrations: true } },
      orderItems: { select: { qty: true, order: { select: { status: true } } } },
    },
  });
  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">Acara</h1>
          <p className="page-sub">Agenda di situs. Acara gratis didaftari anggota, acara berbayar dijual tiketnya di toko</p>
        </div>
      </div>
      <div className="panel" style={{ marginBottom: 16 }}><EventForm /></div>
      <div className="event-admin">
        {events.map((e) => {
          const sold = e.orderItems.filter((i) => i.order.status === 'PAID').reduce((a, b) => a + b.qty, 0);
          const held = e.orderItems.filter((i) => i.order.status === 'PENDING' || i.order.status === 'REVIEW').reduce((a, b) => a + b.qty, 0);
          const upcoming = e.date >= now;
          return (
            <div className="panel product-row" key={e.id}>
              <div className="product-row-main">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {e.imageUrl ? <img src={e.imageUrl} alt="" className="image-thumb" /> : <div className="image-thumb empty-thumb">{dateMed(e.date).split(' ').slice(0, 2).join(' ')}</div>}
                <div style={{ minWidth: 0 }}>
                  <div className="product-row-name">{e.title}</div>
                  <div className="cell-sub">
                    {dateMed(e.date)} · {e.place} · {e.division} · {e.ticketPrice > 0
                      ? `${rupiah(e.ticketPrice)} · ${sold} lunas, ${held} menunggu, sisa ${e.ticketQuota ?? 0}`
                      : `gratis · ${e._count.registrations} / ${e.capacity} terdaftar`}
                  </div>
                </div>
                <span className={`status ${upcoming ? 'wait' : ''}`}>{upcoming ? 'Akan datang' : 'Selesai'}</span>
                <form action={deleteEvent}>
                  <input type="hidden" name="id" value={e.id} />
                  {e.orderItems.length
                    ? <span className="cell-sub" title="Acara yang tiketnya sudah dipesan tidak bisa dihapus">Ada pesanan tiket</span>
                    : <ConfirmButton message={`Hapus acara "${e.title}" beserta ${e._count.registrations} pendaftarannya? Ini tidak bisa dibatalkan.`}>Hapus</ConfirmButton>}
                </form>
              </div>
              <EventForm event={e} />
            </div>
          );
        })}
      </div>
    </>
  );
}

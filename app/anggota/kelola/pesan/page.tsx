import { prisma } from '@/lib/prisma';
import { relative } from '@/lib/format';
import { ConfirmButton } from '@/components/app/ConfirmButton';
import { deleteMessage, toggleMessageRead } from '@/app/actions/admin';

export const metadata = { title: 'Pesan masuk' };

export default async function Page() {
  const messages = await prisma.contactMessage.findMany({ orderBy: [{ read: 'asc' }, { createdAt: 'desc' }] });
  const unread = messages.filter((m) => !m.read).length;
  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">Pesan masuk</h1>
          <p className="page-sub">{unread ? `${unread} belum dibaca` : 'Semua sudah dibaca'} · dari formulir kontak di situs</p>
        </div>
      </div>
      <div className="panel">
        <div className="panel-body">
          {messages.length === 0 && <div className="empty">Belum ada pesan</div>}
          {messages.map((m) => (
            <div className="list-item split" key={m.id}>
              <div style={{ display: 'grid', gap: 4 }}>
                <div className="list-meta">
                  {!m.read && <span className="unread-dot" aria-label="Belum dibaca" />}
                  <span style={{ color: 'var(--text)', fontWeight: 500 }}>{m.name}</span>
                  <a href={`mailto:${m.email}`} style={{ color: 'var(--text-2)' }}>{m.email}</a>
                  <span>{relative(m.createdAt)}</span>
                </div>
                <p className="list-body" style={{ color: m.read ? 'var(--text-2)' : 'var(--text)' }}>{m.message}</p>
              </div>
              <div className="row-actions">
                <a className="btn btn-secondary btn-xs" href={`mailto:${m.email}?subject=${encodeURIComponent('Balasan dari IKPMR Bogor')}`}>Balas</a>
                <form action={toggleMessageRead}>
                  <input type="hidden" name="id" value={m.id} />
                  <input type="hidden" name="read" value={m.read ? '0' : '1'} />
                  <button className="btn btn-ghost btn-xs">{m.read ? 'Tandai belum dibaca' : 'Tandai dibaca'}</button>
                </form>
                <form action={deleteMessage}>
                  <input type="hidden" name="id" value={m.id} />
                  <ConfirmButton message={`Hapus pesan dari ${m.name}?`}>Hapus</ConfirmButton>
                </form>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

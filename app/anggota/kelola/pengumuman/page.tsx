import { prisma } from '@/lib/prisma';
import { relative } from '@/lib/format';
import { AnnouncementForm } from '@/components/app/AdminForms';
import { ConfirmButton } from '@/components/app/ConfirmButton';
import { deleteAnnouncement } from '@/app/actions/admin';

export const metadata = { title: 'Pengumuman' };
const PRIORITY: Record<string, [string, string]> = { HIGH: ['wait', 'Penting'], MEDIUM: ['', 'Info'], LOW: ['', 'Catatan'] };

export default async function Page() {
  const items = await prisma.announcement.findMany({ orderBy: { createdAt: 'desc' }, include: { author: { select: { name: true } } } });
  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">Pengumuman</h1>
          <p className="page-sub">Tampil di beranda semua anggota</p>
        </div>
      </div>
      <div className="panel" style={{ marginBottom: 16 }}><AnnouncementForm /></div>
      <div className="panel">
        <div className="panel-body">
          {items.length === 0 && <div className="empty">Belum ada pengumuman</div>}
          {items.map((a) => (
            <div className="list-item split" key={a.id}>
              <div style={{ display: 'grid', gap: 4 }}>
                <div className="list-meta"><span className={`status ${PRIORITY[a.priority][0]}`}>{PRIORITY[a.priority][1]}</span><span>{relative(a.createdAt)}</span>{a.author && <span>{a.author.name}</span>}</div>
                <div className="list-title">{a.title}</div>
                <p className="list-body">{a.body}</p>
              </div>
              <form action={deleteAnnouncement}>
                <input type="hidden" name="id" value={a.id} />
                <ConfirmButton message={`Hapus pengumuman "${a.title}"?`}>Hapus</ConfirmButton>
              </form>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

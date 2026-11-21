import { prisma } from '@/lib/prisma';
import { GROUPS } from '@/lib/content';
import { ContentGroupForm } from '@/components/app/AdminForms';
import { storageMode } from '@/lib/upload';

export const metadata = { title: 'Isi situs' };

export default async function Page() {
  const rows = await prisma.siteContent.findMany();
  const values = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  const storage = storageMode();
  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">Isi situs</h1>
          <p className="page-sub">Teks dan foto di landing page. Kosongkan kolom untuk kembali ke teks bawaan</p>
        </div>
        <a href="/" target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm">Lihat situs</a>
      </div>
      {storage === 'none' && <div className="form-note">Unggah foto di Vercel butuh Vercel Blob. Teks tetap bisa disimpan.</div>}
      <nav className="jump-list" aria-label="Bagian">
        {GROUPS.map((g) => <a key={g.id} href={`#g-${g.id}`}>{g.title}</a>)}
      </nav>
      <div className="content-groups">
        {GROUPS.map((g) => (
          <div className="panel" id={`g-${g.id}`} key={g.id}>
            <div className="panel-head">
              <div className="panel-title">{g.title}</div>
              {g.note && <div className="panel-meta">{g.note}</div>}
            </div>
            <div className="panel-body"><ContentGroupForm group={g} values={values} /></div>
          </div>
        ))}
      </div>
    </>
  );
}

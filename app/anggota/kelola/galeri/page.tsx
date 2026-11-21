import { prisma } from '@/lib/prisma';
import { dateMed } from '@/lib/format';
import { PhotoForm } from '@/components/app/AdminForms';
import { ConfirmButton } from '@/components/app/ConfirmButton';
import { deletePhoto, updatePhotoCaption } from '@/app/actions/admin';
import { storageMode } from '@/lib/upload';

export const metadata = { title: 'Galeri' };

export default async function Page() {
  const photos = await prisma.galleryPhoto.findMany({ orderBy: { createdAt: 'desc' } });
  const storage = storageMode();
  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">Galeri</h1>
          <p className="page-sub">Tujuh foto terbaru tampil di bagian Momen bersama di situs</p>
        </div>
      </div>
      <div className="panel" style={{ marginBottom: 16 }}><PhotoForm storage={storage} /></div>
      {photos.length === 0
        ? <div className="panel"><div className="empty">Belum ada foto. Situs menampilkan slot kosong sampai foto pertama diunggah.</div></div>
        : (
          <div className="photo-grid">
            {photos.map((p, i) => (
              <figure className="photo" key={p.id}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt={p.caption} loading="lazy" />
                <figcaption className="photo-foot">
                  <div style={{ minWidth: 0 }}>
                    <form action={updatePhotoCaption} className="caption-edit">
                      <input type="hidden" name="id" value={p.id} />
                      <input name="caption" defaultValue={p.caption} className="caption-input" aria-label="Keterangan foto" maxLength={120} />
                    </form>
                    <div className="cell-sub">{i < 7 ? 'Tampil di situs' : dateMed(p.createdAt)}</div>
                  </div>
                  <form action={deletePhoto}>
                    <input type="hidden" name="id" value={p.id} />
                    <ConfirmButton message={`Hapus foto "${p.caption}"?`}>Hapus</ConfirmButton>
                  </form>
                </figcaption>
              </figure>
            ))}
          </div>
        )}
    </>
  );
}

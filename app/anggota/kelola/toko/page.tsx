import { prisma } from '@/lib/prisma';
import { rupiah } from '@/lib/format';
import { ProductForm } from '@/components/app/AdminForms';
import { ConfirmButton } from '@/components/app/ConfirmButton';
import { deleteProduct } from '@/app/actions/shop';

export const metadata = { title: 'Merch' };

export default async function Page() {
  const products = await prisma.product.findMany({
    orderBy: [{ active: 'desc' }, { createdAt: 'desc' }],
    include: { orderItems: { select: { qty: true, order: { select: { status: true } } } } },
  });
  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">Merch</h1>
          <p className="page-sub">Produk yang dijual di halaman toko. Tiket diatur dari menu Acara</p>
        </div>
        <a href="/toko" target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm">Lihat toko</a>
      </div>
      <div className="panel" style={{ marginBottom: 16 }}><ProductForm /></div>
      {products.length === 0
        ? <div className="panel"><div className="empty">Belum ada produk. Bagian toko di situs hanya menampilkan tiket sampai produk pertama ditambahkan.</div></div>
        : (
          <div className="product-admin">
            {products.map((p) => {
              const sold = p.orderItems.filter((i) => i.order.status === 'PAID').reduce((a, b) => a + b.qty, 0);
              return (
                <div className="panel product-row" key={p.id}>
                  <div className="product-row-main">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {p.imageUrl ? <img src={p.imageUrl} alt="" className="image-thumb" /> : <div className="image-thumb empty-thumb">Tanpa foto</div>}
                    <div style={{ minWidth: 0 }}>
                      <div className="product-row-name">{p.name}</div>
                      <div className="cell-sub">{rupiah(p.price)} · stok {p.stock} · terjual {sold}{p.variants ? ` · ${p.variants.split(',').join(', ')}` : ''}</div>
                    </div>
                    <span className={`status ${p.active ? 'ok' : ''}`}>{p.active ? 'Dijual' : 'Disembunyikan'}</span>
                    <form action={deleteProduct}>
                      <input type="hidden" name="id" value={p.id} />
                      <ConfirmButton message={p.orderItems.length ? `"${p.name}" sudah pernah dipesan, jadi hanya disembunyikan dari toko.` : `Hapus "${p.name}"?`}>{p.orderItems.length ? 'Sembunyikan' : 'Hapus'}</ConfirmButton>
                    </form>
                  </div>
                  <ProductForm product={p} />
                </div>
              );
            })}
          </div>
        )}
    </>
  );
}

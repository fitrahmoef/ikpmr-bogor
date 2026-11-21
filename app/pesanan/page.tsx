import { ShopHeader } from '@/components/shop/ShopHeader';
import { LookupForm } from '@/components/shop/ShopForms';

export const metadata = { title: 'Cek pesanan' };

export default function Page() {
  return (
    <>
      <ShopHeader back={{ href: '/toko', label: 'Ke toko' }} />
      <main className="shop-page">
        <div className="shop-inner narrow">
          <h1 className="shop-title">Cek pesanan</h1>
          <p className="section-desc">Masukkan kode pesanan yang kamu dapat saat memesan dan email yang kamu pakai.</p>
          <LookupForm />
        </div>
      </main>
    </>
  );
}

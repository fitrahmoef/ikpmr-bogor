import Link from 'next/link';
import { Logo } from '@/components/brand';
import { ThemeToggle } from '@/components/ThemeToggle';

// The shop and order pages sit outside the landing scroll, so they get a plain bar back home.
export function ShopHeader({ back = { href: '/#toko', label: 'Kembali ke beranda' } }: { back?: { href: string; label: string } }) {
  return (
    <header className="shop-bar">
      <div className="shop-bar-inner">
        <Logo href="/" />
        <div className="shop-bar-actions">
          <Link href={back.href} className="shop-link">{back.label}</Link>
          <ThemeToggle className="theme-toggle" />
        </div>
      </div>
    </header>
  );
}

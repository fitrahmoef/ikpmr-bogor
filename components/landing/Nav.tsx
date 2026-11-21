'use client';
import Link from 'next/link';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Logo } from '@/components/brand';
import { ThemeToggle } from '@/components/ThemeToggle';
import { IconClose, IconMenu } from '@/components/icons';

const BASE: [string, string][] = [
  ['Tentang', '#about'], ['Program', '#programs'], ['Kegiatan', '#events'],
  ['Pengurus', '#members'], ['Sebaran', '#sebaran'], ['Galeri', '#gallery'], ['Kontak', '#contact'],
];
const WITH_SHOP: [string, string][] = [...BASE.slice(0, 3), ['Toko', '#toko'], ...BASE.slice(3)];

// `shop` is true when the landing page renders the #toko section
export function Nav({ account, shop = false }: { account: { href: string; label: string } | null; shop?: boolean }) {
  const NAV = shop ? WITH_SHOP : BASE;
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const [pill, setPill] = useState<{ x: number; w: number } | null>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const lockUntil = useRef(0); // ignore scrollspy while a clicked jump is still scrolling

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // scrollspy: the section crossing the middle band of the viewport is the active one
  useEffect(() => {
    const ids = NAV.map(([, h]) => h.slice(1));
    const els = ids.map((id) => document.getElementById(id)).filter(Boolean) as HTMLElement[];
    const io = new IntersectionObserver((entries) => {
      if (performance.now() < lockUntil.current) return;
      for (const e of entries) if (e.isIntersecting) setActive('#' + e.target.id);
    }, { rootMargin: '-45% 0px -50% 0px' });
    els.forEach((el) => io.observe(el));
    const hero = document.getElementById('hero');
    const heroIo = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && performance.now() >= lockUntil.current) setActive(null);
    }, { rootMargin: '-45% 0px -50% 0px' });
    if (hero) heroIo.observe(hero);
    return () => { io.disconnect(); heroIo.disconnect(); };
  }, [NAV]);

  // the pill slides left or right to sit under the active link
  const measure = useCallback(() => {
    const a = active && listRef.current?.querySelector<HTMLAnchorElement>(`a[href="${active}"]`);
    if (!a || !listRef.current) return setPill(null);
    const base = listRef.current.getBoundingClientRect();
    const r = a.getBoundingClientRect();
    setPill({ x: r.left - base.left, w: r.width });
  }, [active]);
  useLayoutEffect(measure, [measure]);
  useEffect(() => {
    window.addEventListener('resize', measure);
    document.fonts?.ready.then(measure);
    return () => window.removeEventListener('resize', measure);
  }, [measure]);

  const go = (href: string) => {
    lockUntil.current = performance.now() + 1000;
    setActive(href);
  };

  return (
    <nav className={`site-nav ${scrolled || open ? 'scrolled' : ''}`}>
      <div className="nav-inner">
        <Logo href="#hero" />
        <ul className="nav-links" ref={listRef}>
          <li
            className={`nav-pill ${pill ? 'on' : ''}`}
            aria-hidden="true"
            style={pill ? { transform: `translateX(${pill.x}px)`, width: pill.w } : undefined}
          />
          {NAV.map(([l, h]) => (
            <li key={l}>
              <a href={h} className={active === h ? 'active' : ''} aria-current={active === h ? 'location' : undefined} onClick={() => go(h)}>{l}</a>
            </li>
          ))}
        </ul>
        <div className="nav-actions">
          <ThemeToggle />
          {account
            ? <Link href={account.href} className="btn btn-primary btn-sm nav-cta">{account.label}</Link>
            : <>
                <Link href="/masuk" className="nav-login">Masuk</Link>
                <Link href="/daftar" className="btn btn-primary btn-sm nav-cta">Bergabung</Link>
              </>}
          <button className="nav-mobile-toggle" onClick={() => setOpen(!open)} aria-label="Menu" aria-expanded={open}>
            {open ? <IconClose /> : <IconMenu />}
          </button>
        </div>
      </div>
      {open && (
        <div className="mobile-menu">
          {NAV.map(([l, h]) => (
            <a key={l} href={h} className={`mobile-link ${active === h ? 'active' : ''}`} onClick={() => { go(h); setOpen(false); }}>{l}</a>
          ))}
          {account
            ? <Link href={account.href} className="btn btn-primary">{account.label}</Link>
            : <>
                <Link href="/masuk" className="mobile-link">Masuk</Link>
                <Link href="/daftar" className="btn btn-primary">Bergabung</Link>
              </>}
        </div>
      )}
    </nav>
  );
}
